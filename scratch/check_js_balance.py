from pathlib import Path

text = Path("../myapp/App.jsx").read_text(encoding="utf-8")
pairs = {"(": ")", "{": "}", "[": "]"}
stack = []
line = 1
for ch in text:
    if ch == "\n":
        line += 1
        continue
    if ch in pairs:
        stack.append((ch, line))
    elif ch in pairs.values():
        if not stack:
            print("Unmatched closing", ch, "at line", line)
            break
        open_ch, open_line = stack.pop()
        if pairs[open_ch] != ch:
            print(
                "Mismatched", open_ch, "at line", open_line, "with", ch, "at line", line
            )
            break
else:
    if stack:
        print("Unclosed opening", stack[-1][0], "at line", stack[-1][1])
    else:
        print("All delimiters appear balanced")
