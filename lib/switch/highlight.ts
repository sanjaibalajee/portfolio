import "server-only";

import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import c from "@shikijs/langs/c";
import cpp from "@shikijs/langs/cpp";
import csharp from "@shikijs/langs/csharp";
import dart from "@shikijs/langs/dart";
import elixir from "@shikijs/langs/elixir";
import erlang from "@shikijs/langs/erlang";
import go from "@shikijs/langs/go";
import java from "@shikijs/langs/java";
import javascript from "@shikijs/langs/javascript";
import kotlin from "@shikijs/langs/kotlin";
import php from "@shikijs/langs/php";
import python from "@shikijs/langs/python";
import racket from "@shikijs/langs/racket";
import ruby from "@shikijs/langs/ruby";
import rust from "@shikijs/langs/rust";
import scala from "@shikijs/langs/scala";
import sql from "@shikijs/langs/sql";
import swift from "@shikijs/langs/swift";
import typescript from "@shikijs/langs/typescript";
import githubDarkDefault from "@shikijs/themes/github-dark-default";

const SHIKI_LANGUAGES: Record<string, string> = {
  c: "c",
  cpp: "cpp",
  csharp: "csharp",
  dart: "dart",
  elixir: "elixir",
  erlang: "erlang",
  golang: "go",
  java: "java",
  javascript: "javascript",
  kotlin: "kotlin",
  mssql: "sql",
  mysql: "sql",
  oraclesql: "sql",
  php: "php",
  postgresql: "sql",
  python: "python",
  python3: "python",
  pythondata: "python",
  racket: "racket",
  ruby: "ruby",
  rust: "rust",
  scala: "scala",
  swift: "swift",
  typescript: "typescript",
};

// Keep the bundle deliberately narrow: these are the languages LeetCode can
// return, rather than Shiki's full catalog of hundreds of grammars and themes.
const highlighter = createHighlighterCore({
  themes: [githubDarkDefault],
  langs: [
    ...c,
    ...cpp,
    ...csharp,
    ...dart,
    ...elixir,
    ...erlang,
    ...go,
    ...java,
    ...javascript,
    ...kotlin,
    ...php,
    ...python,
    ...racket,
    ...ruby,
    ...rust,
    ...scala,
    ...sql,
    ...swift,
    ...typescript,
  ],
  engine: createJavaScriptRegexEngine(),
});

/** Highlight on the server so the browser receives editor-quality HTML, not a highlighter bundle. */
export async function highlightCode(code: string, language: string) {
  const lang = SHIKI_LANGUAGES[language.toLowerCase()] ?? "text";

  try {
    return (await highlighter).codeToHtml(code, {
      lang,
      theme: "github-dark-default",
      transformers: [
        {
          pre(node) {
            node.properties.tabindex = "0";
          },
        },
      ],
    });
  } catch {
    return (await highlighter).codeToHtml(code, { lang: "text", theme: "github-dark-default" });
  }
}
