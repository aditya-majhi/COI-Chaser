"""Strands Model adapter for Google Gemini with tool calling support."""
import asyncio
import json
import threading
from typing import Any, AsyncGenerator

from google import genai
from google.genai import types
from strands.models.model import Model
from strands.types.streaming import StreamEvent


def _convert_json_schema_to_gemini(schema_dict: dict[str, Any]) -> types.Schema:
    type_map = {
        "string": types.Type.STRING,
        "number": types.Type.NUMBER,
        "integer": types.Type.INTEGER,
        "boolean": types.Type.BOOLEAN,
        "array": types.Type.ARRAY,
        "object": types.Type.OBJECT,
    }
    raw_type = schema_dict.get("type", "object")
    schema_type = type_map.get(raw_type, types.Type.OBJECT)

    properties: dict[str, types.Schema] = {}
    for prop_name, prop_def in schema_dict.get("properties", {}).items():
        properties[prop_name] = _convert_json_schema_to_gemini(prop_def)

    items = None
    if "items" in schema_dict:
        items = _convert_json_schema_to_gemini(schema_dict["items"])

    return types.Schema(
        type=schema_type,
        description=schema_dict.get("description"),
        properties=properties if properties else None,
        required=schema_dict.get("required"),
        items=items,
    )


class GeminiStrandsModel(Model):
    """Custom Strands Agent model provider that routes streaming inference to Google Gemini."""

    def __init__(self, api_key: str, model_id: str = "gemini-2.5-flash-lite", **kwargs: Any):
        self.api_key = api_key
        self.model_id = model_id
        self.config = kwargs
        self.client = genai.Client(api_key=api_key)

    def update_config(self, **model_config: Any) -> None:
        self.config.update(model_config)

    def get_config(self) -> Any:
        return self.config

    async def structured_output(
        self, output_model: Any, prompt: Any, system_prompt: str | None = None, **kwargs: Any
    ) -> AsyncGenerator[dict[str, Any], None]:
        # Generator signature matching Strands Model ABC
        if False:
            yield {}
        raise NotImplementedError("structured_output is not used directly")

    async def stream(
        self,
        messages: Any,
        tool_specs: Any = None,
        system_prompt: str | None = None,
        *,
        tool_choice: Any = None,
        system_prompt_content: Any = None,
        invocation_state: Any = None,
        cancel_signal: threading.Event | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[StreamEvent, None]:
        # Convert tool_specs to Gemini tools if provided
        gemini_tools: list[Any] | None = None
        if tool_specs:
            declarations: list[types.FunctionDeclaration] = []
            for spec in tool_specs:
                input_schema = spec.get("inputSchema", {}).get("json", {})
                param_schema = _convert_json_schema_to_gemini(input_schema) if input_schema else None
                declarations.append(
                    types.FunctionDeclaration(
                        name=spec["name"],
                        description=spec.get("description", ""),
                        parameters=param_schema,
                    )
                )
            gemini_tools = [types.Tool(function_declarations=declarations)]

        # Format conversation messages for Gemini
        prompt_parts: list[str] = []
        if system_prompt:
            prompt_parts.append(f"System instructions:\n{system_prompt}")

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", [])
            if isinstance(content, str):
                prompt_parts.append(f"{role}: {content}")
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                        if "text" in item:
                            prompt_parts.append(f"{role}: {item['text']}")
                        elif "toolResult" in item:
                            tr = item["toolResult"]
                            content_str = json.dumps(tr.get("content", []))
                            prompt_parts.append(f"Tool Result ({tr.get('toolUseId', 'tool')}): {content_str}")

        full_prompt = "\n\n".join(prompt_parts)

        def _call_gemini() -> Any:
            config = types.GenerateContentConfig(
                temperature=0.0,
                tools=gemini_tools if gemini_tools else None,
            )
            return self.client.models.generate_content(
                model=self.model_id,
                contents=full_prompt,
                config=config,
            )

        response = await asyncio.to_thread(_call_gemini)

        # Check if Gemini made function calls
        function_calls = getattr(response, "function_calls", None)
        if function_calls:
            yield {"messageStart": {"role": "assistant"}}
            for idx, call in enumerate(function_calls):
                call_args = call.args if hasattr(call, "args") and call.args is not None else {}
                if not isinstance(call_args, dict):
                    call_args = dict(call_args)
                yield {
                    "contentBlockStart": {
                        "contentBlockIndex": idx,
                        "start": {"toolUse": {"toolUseId": f"call_{idx}_{call.name}", "name": call.name}},
                    }
                }
                yield {
                    "contentBlockDelta": {
                        "contentBlockIndex": idx,
                        "delta": {"toolUse": {"input": json.dumps(call_args)}},
                    }
                }
                yield {"contentBlockStop": {"contentBlockIndex": idx}}
            yield {"messageStop": {"stopReason": "tool_use"}}
        else:
            text = getattr(response, "text", "") or "{}"
            yield {"messageStart": {"role": "assistant"}}
            yield {"contentBlockDelta": {"contentBlockIndex": 0, "delta": {"text": text}}}
            yield {"contentBlockStop": {"contentBlockIndex": 0}}
            yield {"messageStop": {"stopReason": "end_turn"}}
