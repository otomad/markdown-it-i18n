# markdown-it-i18n

A [markdown-it](https://github.com/markdown-it/markdown-it) plugin that proposes a custom **single-page multilingual** format. Instead of maintaining separate files for each language, all translations live together in one file, making it much easier to spot and fix errors across languages simultaneously.

## Why Use It?

If a document contains 7 languages, when you need to fix a mistake that exists in multiple languages, the traditional approach requires you to:

1. Open 7 separate files (one per language).
2. Find the corresponding line in each file.
3. Make the same fix 7 times.

With the single-file format, translations sit right next to each other, so you can fix everything in one place.

## Installation

```bash
npm install markdown-it-i18n
```

## Usage

### As a markdown-it Plugin

```js
import MarkdownIt from "markdown-it";
import i18nMacroPlugin from "markdown-it-i18n";

const md = MarkdownIt();
md.use(i18nMacroPlugin);

// Render with the current language (defaults to "en"):
const html = md.render(markdownSource);
```

#### Specifying the Current Language

There are two ways to tell the plugin which language to render:

**Option 1: Via the environment object** (default — compatible with VitePress):

```js
const html = md.render(markdownSource, { localeIndex: "zh" });
```

**Option 2: Via a custom `getCurrentLang` function:**

```js
const md = MarkdownIt();
md.use(i18nMacroPlugin, {
  getCurrentLang: (state) => state.env.currentLang, // read from a custom env key
});
const html = md.render(markdownSource, { currentLang: "ja" });
```

#### Changing the Source (Root) Language

The source language is the fallback language used when a translation for the current language is missing. It defaults to `"en"`:

```js
md.use(i18nMacroPlugin, {
  rootLang: "zh", // use Chinese as the source language
});
```

You can also pass a function to resolve the root language dynamically at render time:

```js
md.use(i18nMacroPlugin, {
  rootLang: (state) => state.env.rootLang || "en",
});
```

#### Plugin Options

| Option | Type | Default | Description |
|---|---|---|---|
| `getCurrentLang` | `(state: StateCore) => string \| undefined` | `state => state.env.localeIndex` | Returns the target language for rendering. Compatible with VitePress by default. |
| `rootLang` | `string \| ((state: StateCore) => string)` | `"en"` | The source root language. When the current language is missing a translation, the plugin automatically falls back to this language. |

### Standalone Utility (No markdown-it Required)

You can use the `parseI18nMacro` utility function directly to convert markdown with i18n macros into standard single-language markdown — **without** markdown-it or any other markdown rendering plugin:

```js
import { parseI18nMacro } from "markdown-it-i18n/utils";

const src = `@en This is English content.
@zh 这是中文内容。
@ja これは日本語の内容です。`;

const pureMarkdown = parseI18nMacro(src, "zh");
// Result: "这是中文内容。"
```

This is useful when you want to preprocess i18n-marked content before feeding it to any markdown parser, or when you are building a custom pipeline that only needs the raw single-language markdown text.

#### Function Signature

```ts
function parseI18nMacro(
  src: string,
  currentLang?: string,
  rootLang?: string
): string;
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | *(required)* | The markdown source string containing i18n macro syntax. |
| `currentLang` | `string \| undefined` | `rootLang` | The target language to extract. If omitted or `undefined`, falls back to `rootLang`. |
| `rootLang` | `string` | `"en"` | The source root language. Used as fallback when `currentLang` is not found in the translation. |

### Utility: Parsing Locale Tags

The package also exports a `parseLocale` helper for validating and normalizing BCP 47 language tags:

```js
import { parseLocale } from "markdown-it-i18n/utils";

const locale = parseLocale("zh");
console.log(locale?.toString()); // "zh-Hans-CN"
```

This function tries to parse any BCP 47 tag and returns a maximized `Intl.Locale` object with the most likely script and region values. If the tag is invalid, it returns `null` instead of throwing an error — safe for use with user-supplied input.

## Syntax

### Line-Level Multilingual

For translating individual lines, use the **`@` prefix** followed by a language tag, a space, and the translated content:

```markdown
@en This is English content.
@zh 这是中文内容。
@ja これは日本語の内容です。
```

### Block-Level Multilingual

For large blocks of content — such as entire paragraphs with complex formatting, tables, or admonition blocks — use **`@@@` delimiters**:

```markdown
@@@en
This is a large block of English content.
It can span multiple lines and include **formatting**.
@@@zh
这是一大段中文内容。
它可以跨越多行并包含**格式**。
@@@
```

- Start a block with `@@@` followed by a language tag.
- End the **entire** multilingual block with a bare `@@@` on its own line.

### Fallback Behavior

If a particular language is missing for a line or block, the plugin will automatically **fall back to the source language** (defaults to English). This means you only need to write translations for languages you know — missing ones will safely display the source language content instead.

## Intentionally Skipping Translations

In some cases, a phrase may be **inherently redundant** when translated literally into a certain language, resulting in unnatural or tautological text. For example, when a definition already encapsulates the meaning in the term itself:

- *"Beef is the meat of cattle."* — In Chinese, the literal translation would be「牛肉是牛的肉」, which reads as an awkward tautology because「牛肉」already contains「牛」(cattle) and「肉」(meat).
- *"Watermelon is a melon full of water."* — The literal English rendering「西瓜是水分十足的瓜」is similarly redundant since「西瓜」already embeds「西」(west/foreign) and「瓜」(melon/gourd).

For these situations, you can **deliberately leave a translation empty**. The plugin will omit the content entirely for that language, while still displaying it normally for languages where the phrase is not redundant:

```markdown
@en Beef is the meat of cattle.
@zh
```

Or for blocks:

```markdown
@@@en
Beef is the meat of cattle.
@@@zh
@@@
```

When the source language content itself is redundant and you want to drop it while keeping translations, leave the source language entry empty:

```markdown
@en
@zh 西瓜是水分十足的瓜。
```

In this case, when rendering in English, the output will be empty (no content displayed), while rendering in Chinese will show「西瓜是水分十足的瓜。」.

The same applies to fallback logic — if both the current language and the source language entries are empty, the plugin produces an empty result, effectively removing the redundant segment from the output.

## Important Rules

- **Do not** mix line-level (`@`) and block-level (`@@@`) syntax for the same content — pick one approach and stay consistent.
- The `@` or `@@@` markers must appear at the very beginning of a line.
- Language tags may contain letters, digits, underscores, and hyphens (e.g., `en`, `zh-CN`, `pt_BR`).
- Empty lines between multilingual groups signal separate content blocks and will affect list rendering in markdown-it.

## How It Works

The plugin registers a [core rule](https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md) called `i18n_macro_preprocessor` that runs **before** the `block` rule. At that stage, `state.src` is still a raw string, so the plugin preprocesses the i18n macro syntax and reduces it to a single-language markdown string. All other markdown-it rules (block, inline, renderer) then process the result as usual. This means the plugin is fully compatible with any other markdown-it plugin and all standard markdown syntax.

## License

[MIT](LICENSE)
