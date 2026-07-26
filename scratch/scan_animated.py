import os, re, glob

root = r'D:\git_Repo\Voice-To-Text\myapp\components'


def find_conflicts(path):
    text = open(path, encoding='utf-8').read()
    lines = text.splitlines()
    scopes = []
    declarations = []

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith('//'):
            continue

        if 'const ' in stripped and 'useRef(new Animated.Value' in stripped:
            m = re.search(r'const\s+(\w+)\s*=\s*useRef\(new\s+Animated\.Value', stripped)
            if m:
                declarations.append((idx + 1, m.group(1)))

    for decl_line, var_name in declarations:
        matches = []
        for line_no, line in enumerate(lines, start=1):
            if line_no < decl_line:
                continue
            if re.search(r'Animated\.(timing|spring|parallel|sequence)\(', line):
                if re.search(r'\b' + re.escape(var_name) + r'\b', line):
                    m = re.search(r'useNativeDriver:\s*(true|false)', line)
                    if m:
                        matches.append((line_no, m.group(1)))
            if line_no > decl_line + 80:
                break
        drivers = {d for _, d in matches}
        if {'true', 'false'} <= drivers:
            print(os.path.basename(path), var_name, sorted(drivers), 'at lines', [ln for ln, _ in matches])

for path in sorted(glob.glob(os.path.join(root, '*.jsx'))):
    find_conflicts(path)
