"""
HireFlow AI — Token Counter Utility.

Tracks cumulative Qwen API token usage per session and prints
running totals to your terminal so you can monitor spend in real time.

Usage in terminal while the server runs:
  Every Qwen call logs: [TOKEN COUNTER] prompt=... completion=... total_session=...
"""

import logging
from dataclasses import dataclass, field
from threading import Lock

logger = logging.getLogger("hireflow.tokens")


@dataclass
class TokenCounter:
    """
    Thread-safe counter for prompt, completion, and total tokens.

    Input: token counts passed via record() after each API call
    Output: cumulative totals and formatted log lines in terminal
    """

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    call_count: int = 0
    _lock: Lock = field(default_factory=Lock, repr=False)

    def record(self, prompt: int, completion: int, model: str = "") -> dict[str, int]:
        """
        Add token usage from one API call and log to terminal.

        Input:
            prompt: number of input/prompt tokens used
            completion: number of output/completion tokens used
            model: optional model name for the log line
        Output:
            dict with prompt, completion, total for this call, and session_total
        """
        call_total = prompt + completion
        with self._lock:
            self.prompt_tokens += prompt
            self.completion_tokens += completion
            self.total_tokens += call_total
            self.call_count += 1
            session_total = self.total_tokens

        model_label = f" model={model}" if model else ""
        logger.info(
            "[TOKEN COUNTER] call #%d%s | this_call: prompt=%d completion=%d total=%d | "
            "session: prompt=%d completion=%d total=%d",
            self.call_count,
            model_label,
            prompt,
            completion,
            call_total,
            self.prompt_tokens,
            self.completion_tokens,
            session_total,
        )
        return {
            "prompt_tokens": prompt,
            "completion_tokens": completion,
            "total_tokens": call_total,
            "session_total": session_total,
        }

    def get_summary(self) -> dict[str, int]:
        """
        Return current session token totals without modifying counters.

        Input: none
        Output: dict with prompt_tokens, completion_tokens, total_tokens, call_count
        """
        with self._lock:
            return {
                "prompt_tokens": self.prompt_tokens,
                "completion_tokens": self.completion_tokens,
                "total_tokens": self.total_tokens,
                "call_count": self.call_count,
            }

    def reset(self) -> None:
        """
        Reset all counters to zero (useful between test runs).

        Input: none
        Output: none (counters cleared)
        """
        with self._lock:
            self.prompt_tokens = 0
            self.completion_tokens = 0
            self.total_tokens = 0
            self.call_count = 0


# Global singleton used by qwen_client across the app
token_counter = TokenCounter()
