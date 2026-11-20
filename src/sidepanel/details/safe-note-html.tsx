import {createElement, Fragment, ReactNode, useMemo} from 'react';
import {LinkifyNewTab} from './linkify-new-tab';

/**
 * Render a limited subset of GEDCOM HTML without injecting raw HTML.
 * Only whitelisted formatting elements and HTTP(S) links are preserved.
 */
const ALLOWED = new Set([
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'div',
  'span',
  'h3',
  'h4',
]);

function safeNode(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return <LinkifyNewTab key={key}>{node.textContent ?? ''}</LinkifyNewTab>;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  // Do not render content from embedded executable or style elements.
  if (
    [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'svg',
      'math',
      'form',
    ].includes(tag)
  ) {
    return null;
  }
  const children = Array.from(element.childNodes).map(safeNode);
  if (tag === 'a') {
    const href = element.getAttribute('href') ?? '';
    if (/^https?:\/\//i.test(href)) {
      return createElement(
        'a',
        {
          key,
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        ...children,
      );
    }
    return <Fragment key={key}>{children}</Fragment>;
  }
  if (!ALLOWED.has(tag)) return <Fragment key={key}>{children}</Fragment>;
  return createElement(tag, {key}, ...children);
}

export function SafeNoteHtml({text}: {text: string}) {
  const content = useMemo(() => {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return Array.from(doc.body.childNodes).map(safeNode);
  }, [text]);
  return (
    <div className="gedcom-note" style={{whiteSpace: 'pre-wrap'}}>
      {content}
    </div>
  );
}
