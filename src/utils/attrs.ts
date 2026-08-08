export function replaceId(source: string, replacer: (oldId: string) => string): string {
	// ---------- 主逻辑 ----------
	const block = findBlockAttr(source);

	// 情况1：原本没有块级属性
	if (!block) {
		const newId = replacer(undefined!);
		if (!newId) return source; // falsy → 不添加

		const attrStr = buildIdAttr(newId);
		// 在最后一个非空白字符之后插入属性，保留原有尾部空白
		let lastNonSpace = source.length - 1;
		while (lastNonSpace >= 0 && isSpace(source[lastNonSpace])) lastNonSpace--;
		const prefix = source.substring(0, lastNonSpace + 1);
		const tailSpaces = source.substring(lastNonSpace + 1);
		return `${prefix} {${attrStr}}${tailSpaces}`;
	}

	// 情况2：存在块级属性
	const inner = block.attr.slice(1, -1);
	const attrs = parseAttrs(inner);

	let oldId: string | undefined;
	const newAttrParts: string[] = [];

	for (const attr of attrs) {
		if (attr.type === "id") {
			oldId = attr.value;
			// 旧的 id 属性不加入 newAttrParts，相当于删除
		} else {
			newAttrParts.push(attr.raw);
		}
	}

	const newId = replacer(oldId!);
	if (newId) {
		newAttrParts.push(buildIdAttr(newId));
	}

	const newInner = newAttrParts.join(" ");
	// 原分隔空白字符（即 { 前面的一个字符）
	const sepIdx = block.start - 1;
	const separator = source[sepIdx]; // 一定是空白
	const afterBlock = source.substring(block.end + 1); // 属性之后的部分（含尾部空白）

	if (newInner.length === 0) {
		// 删除整个块属性及前导空白，保留之后的内容
		return source.substring(0, sepIdx) + afterBlock;
	}

	const replacement = `${separator}{${newInner}}`;
	return source.substring(0, sepIdx) + replacement + afterBlock;
}

// 判断字符是否为 Unicode 空白
function isSpace(ch: string): boolean {
	// 使用正则 \s 覆盖大部分常见空白（空格、制表、换行等），
	// 但换行一般不会出现在单行字符串内，此处依旧安全。
	return /\s/.test(ch);
}

// 查找块级属性 { ... } 的位置（行尾，且前有一个空白字符）
function findBlockAttr(s: string): { start: number; end: number; attr: string } | null {
	let i = s.length - 1;
	while (i >= 0 && isSpace(s[i])) i--;
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
				// 前面一个字符必须是空白
				if (j > 0 && isSpace(s[j - 1])) {
					return { start: j, end, attr: s.substring(j, end + 1) };
				}
				return null;
			}
		}
	}
	return null;
}

// 引号内的字符串反转义
function unescape(str: string, quote: string): string {
	let result = "";
	let escaped = false;
	for (const ch of str) {
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

// 解析属性列表
function parseAttrs(inner: string) {
	interface Attr {
		type: "id" | "class" | "attr" | "bool";
		value?: string;
		raw: string;
		key?: string;
	}
	const attrs: Attr[] = [];
	let i = 0;
	while (i < inner.length) {
		while (i < inner.length && isSpace(inner[i])) i++;
		if (i >= inner.length) break;

		const start = i;
		const ch = inner[i];

		if (ch === "#") {
			i++;
			const valStart = i;
			while (i < inner.length && !isSpace(inner[i]) && inner[i] !== "}") i++;
			attrs.push({
				type: "id",
				value: inner.substring(valStart, i),
				raw: inner.substring(start, i),
			});
		} else if (ch === ".") {
			i++;
			const valStart = i;
			while (i < inner.length && !isSpace(inner[i]) && inner[i] !== "}") i++;
			attrs.push({
				type: "class",
				value: inner.substring(valStart, i),
				raw: inner.substring(start, i),
			});
		} else {
			let keyStart = i;
			while (i < inner.length && inner[i] !== "=" && !isSpace(inner[i]) && inner[i] !== "}") i++;
			const key = inner.substring(keyStart, i);
			if (i < inner.length && inner[i] === "=") {
				i++; // 跳过 '='
				let value: string, raw: string;
				if (i < inner.length && (inner[i] === '"' || inner[i] === "'")) {
					const quote = inner[i];
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
					raw = inner.substring(start, i);
				} else {
					const valStart = i;
					while (i < inner.length && !isSpace(inner[i]) && inner[i] !== "}") i++;
					value = inner.substring(valStart, i);
					raw = inner.substring(start, i);
				}
				// id 属性统一记为 type: 'id'
				if (key === "id") {
					attrs.push({ type: "id", value, raw });
				} else {
					attrs.push({ type: "attr", key, value, raw });
				}
			} else {
				attrs.push({ type: "bool", key, raw: inner.substring(start, i) });
			}
		}
	}
	return attrs;
}

// 构造 id 属性片段（自动选择 #id 或 id="..."）
function buildIdAttr(id: string): string {
	if (/[\s"'{}]/.test(id)) {
		const escaped = id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		return `id="${escaped}"`;
	}
	return `#${id}`;
}
