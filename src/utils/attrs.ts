export function replaceId(source: string, replacer: (oldId?: string) => string): string {
	// ---------- 主逻辑 ----------
	const block = findBlockAttr(source);

	// 情况1：没有块级属性
	if (!block) {
		const newId = replacer(undefined);
		if (!newId) return source; // falsy → 不添加
		const attrStr = buildIdAttr(newId);
		const trimmed = source.trimEnd();
		return `${trimmed} {${attrStr}}`;
	}

	// 情况2：存在块级属性
	const inner = block.attr.slice(1, -1); // 去掉首尾花括号
	const attrs = parseAttrs(inner);

	let idIndex = -1;
	let oldId: string | undefined;
	for (let i = 0; i < attrs.length; i++) {
		if (attrs[i].type === "id") {
			idIndex = i;
			oldId = attrs[i].value;
			break;
		}
	}

	const newId = replacer(oldId);
	// 收集除旧 id 之外的所有属性（保留原始字符串）
	const newAttrParts: string[] = [];
	for (let i = 0; i < attrs.length; i++) {
		if (i !== idIndex) newAttrParts.push(attrs[i].raw);
	}
	if (newId) {
		newAttrParts.push(buildIdAttr(newId));
	}

	const newInner = newAttrParts.join(" ");
	const replaceStart = block.start - 1; // 前导空格的位置
	const replaceEnd = source.length; // 到行尾（含尾随空格）

	if (newInner.length === 0) {
		// 删除整个块级属性及前导空格
		return source.substring(0, replaceStart);
	}
	const replacement = ` {${newInner}}`;
	return source.substring(0, replaceStart) + replacement;
}

// ---------- 辅助函数 ----------
// 查找块级属性 { ... } 的位置（行尾，且前有一个空格）
function findBlockAttr(s: string): { start: number; end: number; attr: string } | null {
	let i = s.length - 1;
	while (i >= 0 && s[i] === " ") i--;
	if (i < 0 || s[i] !== "}") return null;

	let depth = 0;
	let inString = false;
	let stringChar = "";
	let escape = false;
	const end = i;

	for (let j = i; j >= 0; j--) {
		const ch = s[j];
		if (escape) {
			escape = false;
			continue;
		}
		if (inString) {
			if (ch === "\\") {
				escape = true;
			} else if (ch === stringChar) {
				inString = false;
			}
			continue;
		}
		if (ch === '"' || ch === "'") {
			inString = true;
			stringChar = ch;
			continue;
		}
		if (ch === "}") {
			depth++;
		} else if (ch === "{") {
			depth--;
			if (depth === 0) {
				// 前面的字符必须是空格
				if (j > 0 && s[j - 1] === " ") {
					return { start: j, end, attr: s.substring(j, end + 1) };
				}
				return null;
			}
		}
	}
	return null;
}

// 对引号内的值进行反转义
function unescape(str: string, quote: string): string {
	let result = "";
	let escaped = false;
	for (let k = 0; k < str.length; k++) {
		const ch = str[k];
		if (escaped) {
			if (ch === quote || ch === "\\") {
				result += ch;
			} else {
				result += "\\" + ch;
			}
			escaped = false;
		} else if (ch === "\\") {
			escaped = true;
		} else {
			result += ch;
		}
	}
	if (escaped) result += "\\";
	return result;
}

// 解析花括号内的属性字符串，返回属性片段数组
function parseAttrs(inner: string) {
	const attrs: Array<{
		type: string;
		value?: string;
		raw: string;
		key?: string;
		quoted?: boolean;
		quote?: string;
	}> = [];
	let i = 0;
	while (i < inner.length) {
		while (i < inner.length && inner[i] === " ") i++;
		if (i >= inner.length) break;

		const start = i;
		const ch = inner[i];

		if (ch === "#") {
			i++;
			const valStart = i;
			while (i < inner.length && inner[i] !== " " && inner[i] !== "}") i++;
			attrs.push({ type: "id", value: inner.substring(valStart, i), raw: inner.substring(start, i) });
		} else if (ch === ".") {
			i++;
			const valStart = i;
			while (i < inner.length && inner[i] !== " " && inner[i] !== "}") i++;
			attrs.push({ type: "class", value: inner.substring(valStart, i), raw: inner.substring(start, i) });
		} else {
			let keyStart = i;
			while (i < inner.length && inner[i] !== "=" && inner[i] !== " " && inner[i] !== "}") i++;
			const key = inner.substring(keyStart, i);
			if (i < inner.length && inner[i] === "=") {
				i++; // 跳过 '='
				let value: string,
					raw: string,
					quoted = false,
					quote = "";
				if (i < inner.length && (inner[i] === '"' || inner[i] === "'")) {
					quote = inner[i];
					i++;
					const valStart = i;
					let escaped = false;
					while (i < inner.length) {
						if (escaped) {
							escaped = false;
							i++;
							continue;
						}
						if (inner[i] === "\\") {
							escaped = true;
							i++;
							continue;
						}
						if (inner[i] === quote) break;
						i++;
					}
					value = unescape(inner.substring(valStart, i), quote);
					if (i < inner.length) i++; // 跳过结束引号
					quoted = true;
					raw = inner.substring(start, i);
				} else {
					const valStart = i;
					while (i < inner.length && inner[i] !== " " && inner[i] !== "}") i++;
					value = inner.substring(valStart, i);
					raw = inner.substring(start, i);
				}
				attrs.push({ type: "attr", key, value, quoted, quote, raw });
			} else {
				attrs.push({ type: "bool", key, raw: inner.substring(start, i) });
			}
		}
	}
	return attrs;
}

// 构造 id 属性片段（#id 或 id="..."）
function buildIdAttr(id: string): string {
	if (/[\s"'{}]/.test(id)) {
		const escaped = id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		return `id="${escaped}"`;
	}
	return `#${id}`;
}
