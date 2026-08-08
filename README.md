# markdown-it-i18n

[![npm](https://img.shields.io/npm/v/markdown-it-i18n?logo=npm&logoColor=%23CB3837&label=npm&labelColor=white&color=%23CB3837)](https://www.npmjs.org/package/markdown-it-i18n)
[![GitHub](https://img.shields.io/npm/v/markdown-it-i18n?logo=github&label=GitHub&color=%23181717)](https://github.com/otomad/markdown-it-i18n)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)][license-url]

[license-url]: https://opensource.org/licenses/MIT

A [markdown-it](https://github.com/markdown-it/markdown-it) plugin that provides a custom **single-page multilingual** format. Instead of maintaining separate files for each language, all translations live together in one file, making it much easier to spot and fix errors across languages simultaneously.

## Why Use It?

If a document contains 7 languages, when you need to fix a mistake that exists in multiple languages, the traditional approach requires you to:

1. Open 7 separate files (one per language).
2. Find the corresponding line in each file.
3. Make the same fix 7 times.

With the single-page format, translations sit right next to each other, so you can fix everything in one place.

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

### Escaping the Macro Syntax

If you need to render a literal `@` followed by a language tag (e.g., in a sentence explaining how the plugin works), escape it with a backslash:

```markdown
\@en This will render as literal "@en" text, not as a translation macro.
\@@@en
This entire block will be treated as literal text, not a multilingual block.
\@@@
```

Within code blocks, backslash pairs (`\\`) are automatically reduced to a single backslash, preserving the expected behavior for programming languages that use `@` annotations (e.g., Java's `@Deprecated`).

### Fallback Behavior

If a particular language is missing for a line or block, the plugin will automatically **fall back to the source language** (defaults to English). This means you only need to write translations for languages you know — missing ones will safely display the source language content instead.

The fallback is powered by a built-in [`Intl.LocaleMatcher`](https://tc39.es/ecma402/#sec-locale-negotiation) (via [`@formatjs/intl-localematcher`](https://www.npmjs.com/package/@formatjs/intl-localematcher)), which **intelligently matches mutually intelligible languages** even when an exact match is unavailable. For example:

| Requested Language | Available Languages | Matched Result | Reason |
|---|---|---|---|
| `zh-HK` | `zh-CN`, `zh-TW` | `zh-TW` | Both are Traditional Chinese and mutually intelligible. |
| `zh-MO` | `zh-CN`, `zh-HK`, `zh-TW` | `zh-HK` | Cantonese-speaking regions map to each other. |
| `ms` (Malay) | `zh`, `en`, `vi`, `id`, `th`, `lo`, `my`, `km` | `id` (Indonesian) | Malay and Indonesian are mutually intelligible. |
| `da` (Danish) | `zh`, `en`, `no`, `sv`, `nl` | `no` (Norwegian) | Danish and Norwegian are mutually intelligible. |
| `fa` (Persian) | `ar` (Arabic) | *(falls back to `rootLang`)* | These languages are not mutually intelligible, so no automatic matching occurs. |

This means you do **not** need to exhaustively list every possible locale variant in your document — the matcher handles it for you.

## Intentionally Skipping Translations

In some cases, a phrase may be **inherently redundant** when translated literally into a certain language, resulting in unnatural or tautological text. For example, when a definition already encapsulates the meaning in the term itself:

- *"Beef is the meat of cattle."* — In Chinese, the literal translation would be「牛肉是牛的肉」, which reads as an awkward tautology because「牛肉」already contains「牛」(cattle) and「肉」(meat).
- *「西瓜是水分十足的瓜」* — The literal English rendering "Watermelon is a melon full of water." is similarly redundant since "watermelon" already embeds "water" and "melon".

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
- The `@` or `@@@` markers must appear at the very beginning of a line (no indentation), and they should not be escaped unless you intend to render them literally.
- For line-level translations, languages can appear in any order, but keeping them consistent (e.g., always `@en` first, then `@zh`) helps readability.
- The language tag must be a valid [Unicode BCP 47 Locale Identifier](https://unicode.org/reports/tr35/#Unicode_locale_identifier), which may contain letters, digits, and hyphens (e.g., `fa`, `es-MX`, `zh-Hant-TW`). **Do not use underscores!**
  - ❎ `pt_BR`
  - ☑️ `pt-BR`
- Empty lines between multilingual groups signal separate content blocks and will affect list rendering in markdown-it.

## Installation

```bash
# npm
npm install markdown-it-i18n

# yarn
yarn add markdown-it-i18n

# pnpm
pnpm add markdown-it-i18n
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

When using VitePress, the default locale `"root"` is automatically mapped to `"en"` for convenience.

**Option 2: Via a custom `getCurrentLang` function:**

```js
const md = MarkdownIt();
md.use(i18nMacroPlugin, {
  getCurrentLang: (state) => state.env.currentLang, // Read from a custom env key.
});
const html = md.render(markdownSource, { currentLang: "ja" });
```

#### Language Aliases (`langAlias`)

If you prefer to use short, custom aliases instead of standard BCP 47 language tags in your markdown source, you can configure the `langAlias` option:

```js
const md = MarkdownIt();
md.use(i18nMacroPlugin, {
  langAlias: {
    zhs: "zh-CN",       // Simplified Chinese
    zht: "zh-TW",       // Traditional Chinese
    // If you believe that both Spanish and Portuguese speakers can understand Italian, you can put them in an array.
    it: ["es", "pt"],
  },
});
const html = md.render(markdownSource, { localeIndex: "zh-TW" });
```

Now you can use your custom aliases in the markdown source:

```markdown
<!-- Without `langAlias` -->
@en This is English content.
@zh-CN 这是简体中文内容。
@zh-TW 這是繁體中文內容。

<!-- With `langAlias` -->
@en This is English content.
@zhs 这是简体中文内容。
@zht 這是繁體中文內容。
```

> **Note:** The `langAlias` option accepts an **object** mapping alias names to standard locale identifiers. Unlike earlier versions, it no longer supports a callback function. Thanks to the built-in locale matcher, you do **not** need to enumerate every possible locale variant — for example, `{ zht: "zh-TW" }` is sufficient; it will automatically match `zh-HK`, `zh-MO`, and other mutually intelligible Traditional Chinese locales. Writing `{ zht: ["zh-TW", "zh-HK", "zh-MO", "zh-Hant"] }` is redundant and unnecessary.

**Please don't do this!** Languages that are mutually intelligible will be automatically converted.

```js
const md = MarkdownIt();
md.use(i18nMacroPlugin, {
  langAlias: {
    zht: ["zh-TW", "zh-HK", "zh-MO", "zh-Hant", "zh-Hant-TW", "zh-Hant-HK", "zh-Hant-MO", "zh-Hant-CN", "yue", "yue-HK", "yue-MO", "yue-Hant-HK", "yue-Hant-MO"],
  },
});
const html = md.render(markdownSource, { localeIndex: "zh-TW" });
```

#### Changing the Source (Root) Language

The source language is the fallback language used when a translation for the current language is missing. It defaults to `"en"`:

```js
md.use(i18nMacroPlugin, {
  rootLang: "fr", // Use French as the source language.
});
```

You can also pass a function to resolve the root language dynamically at render time:

```js
md.use(i18nMacroPlugin, {
  rootLang: (state) => state.env.rootLang || "en",
});
```

#### Consistent Heading IDs (`consistentHeadingId`)

*This option is disabled by default.*

When enabled, this option ensures that the same heading title has a **consistent HTML `id` attribute across all languages**. This greatly improves the user experience when switching languages — the URL hash (anchor) remains the same, so the page automatically scrolls to the same heading position instead of resetting to the top because the target ID disappeared.

The ID is generated from the heading text in a specified language (defaults to English) and is appended using the `{#id}` attribute syntax, which is compatible with [`markdown-it-attrs`](https://www.npmjs.com/package/markdown-it-attrs). You can use `markdown-it-attrs` (or any other plugin with compatible syntax) to process these attributes, but it is not mandatory — the attributes are simply added to the markdown output.

```js
const md = MarkdownIt();
md.use(i18nMacroPlugin, {
  consistentHeadingId: true,
});
```

**Without `consistentHeadingId`** — headings in different languages produce different IDs, causing broken anchors on language switch:

```markdown
@en # This is English title    → <h1 id="this-is-english-title">
@zh # 这是中文标题              → <h1 id="这是中文标题">
```

**With `consistentHeadingId`** — all headings share the same ID based on English text, so anchors work in every language:

```markdown
@en # This is English title    → <h1 id="this-is-english-title">
@zh # 这是中文标题              → <h1 id="this-is-english-title">
```

The actual output adds the `{#id}` syntax for downstream plugins to consume:

```markdown
@en # This is English title {#this-is-english-title}
@zh # 这是中文标题 {#this-is-english-title}
```

**Customizing the slug source language:**

```js
md.use(i18nMacroPlugin, {
  consistentHeadingId: {
    useLang: "fr", // Generate IDs from French text instead.
  },
});
```

You can also resolve `useLang` dynamically via a function in the plugin context:

```js
md.use(i18nMacroPlugin, {
  consistentHeadingId: {
    useLang: (state) => state.env.headingIdLang || "en",
  },
});
```

**Important notes on `consistentHeadingId`:**

- It only works with **line-level multilingual** syntax (`@`). Block-level (`@@@`) is not supported for this feature.
- If a heading already has an **explicitly specified ID** (e.g., `# Title {#my-custom-id}`), the plugin will **not** override it — user-specified IDs are always preserved.
- The plugin does **not** handle duplicate heading titles; if multiple headings produce the same slug, you need to adjust the options of downstream plugins (like [`markdown-it-anchor`](https://www.npmjs.com/package/markdown-it-anchor)) to avoid errors.

#### Plugin Options Reference

| Option | Type | Default | Description |
|---|---|---|---|
| `getCurrentLang` | `(state: StateCore) => string \| undefined` | `state => state.env.localeIndex` | Returns the target language for rendering. Compatible with VitePress by default. `"root"` maps to `"en"`. |
| `langAlias` | `Record<string, string \| string[]>` | `{}` | Maps custom alias names to standard BCP 47 locale identifiers. Values can be a single locale string or an array of locales. No longer supports callback functions. |
| `rootLang` | `string \| ((state: StateCore) => string)` | `"en"` | The source root language. When the current language is missing a translation, the plugin automatically falls back to this language. |
| `consistentHeadingId` | `boolean \| { useLang?: string \| ((state: StateCore) => string) }` | `false` | Ensures consistent heading IDs across all languages. Pass `true` for defaults (IDs based on English), or an object with `useLang` to customize the slug source language. |

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
  options?: {
    rootLang?: string;
    consistentHeadingId?: boolean | { useLang?: string };
    langAlias?: Record<string, string | string[]>;
    md?: MarkdownIt;
    env?: any;
  }
): string;
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | *(required)* | The markdown source string containing i18n macro syntax. |
| `currentLang` | `string \| undefined` | `rootLang` | The target language to extract. If omitted or `undefined`, falls back to `rootLang`. |
| `options.rootLang` | `string` | `"en"` | The source root language. Used as fallback when `currentLang` is not found in the translation. |
| `options.consistentHeadingId` | `boolean \| { useLang?: string }` | `false` | Ensures consistent heading IDs across languages. Only `useLang` as a string is supported (no function), since there is no markdown-it state in standalone mode. |
| `options.langAlias` | `Record<string, string \| string[]>` | `{}` | Maps custom alias names to standard BCP 47 locale identifiers. |
| `options.md` | `MarkdownIt \| undefined` | `undefined` | Optional markdown-it instance for more accurate heading content extraction (used by `consistentHeadingId`). If omitted, a simpler regex-based extraction is used. |
| `options.env` | `any` | `undefined` | Optional environment variables passed to the markdown-it renderer (used by `consistentHeadingId` when `md` is provided). |

> **Breaking change from 1.x:** The third parameter is now an options object instead of a plain `rootLang` string. To migrate, replace `parseI18nMacro(src, lang, "zh")` with `parseI18nMacro(src, lang, { rootLang: "zh" })`.

## How It Works

The plugin registers a [core rule](https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md) called `i18n_macro_preprocessor` that runs **before** the `block` rule. At that stage, `state.src` is still a raw string, so the plugin preprocesses the i18n macro syntax and reduces it to a single-language markdown string. A second core rule handles backslash pair escaping within code blocks. All other markdown-it rules (block, inline, renderer) then process the result as usual. This means the plugin is fully compatible with any other markdown-it plugin and all standard markdown syntax.

## License

[MIT](LICENSE)
