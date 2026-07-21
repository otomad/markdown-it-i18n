# markdown-it-i18n

This plugin proposes a custom **single-page multilingual** format. Instead of maintaining separate files for each language, all translations live together in one file. This makes it much easier to spot and fix errors across languages simultaneously.

### Why Use It?

If the document contains 7 languages, when you need to fix a mistake that exists in multiple languages, the traditional approach requires you to:

1. Open 7 separate files (one per language)
2. Find the corresponding line in each file
3. Make the same fix 7 times

With the single-file format, translations sit right next to each other, so you can fix everything in one place.

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

- Start a block with `@@@` followed by a language tag
- End the **entire** multilingual block with a bare `@@@` on its own line

### Fallback Behavior

If a particular language is missing for a line or block, the site will automatically **fallback to source language**. Defaults to English. This means you only need to write translations for languages you know — missing ones will safely display the source language instead.

### Important Rules

- **Do not** mix line-level (`@`) and block-level (`@@@`) syntax for the same content — pick one.
- The `@` or `@@@` markers must appear at the very beginning of a line.
