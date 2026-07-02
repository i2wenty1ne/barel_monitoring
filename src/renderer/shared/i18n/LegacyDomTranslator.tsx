import { useEffect } from 'react';
import { i18n } from './i18n';
import { legacyTextTranslations } from './legacyTextTranslations';

const originalTextByNode = new WeakMap<Text, string>();
const originalAttributeByElement = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ['aria-label', 'title'];

export function LegacyDomTranslator(): null {
  useEffect(() => {
    function translateRoot(): void {
      translateElement(document.body);
    }

    translateRoot();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            translateElement(node as Element);
          }
        });

        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(mutation.target as Text);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });

    i18n.on('languageChanged', translateRoot);

    return () => {
      observer.disconnect();
      i18n.off('languageChanged', translateRoot);
    };
  }, []);

  return null;
}

function translateElement(element: Element): void {
  if (shouldSkipElement(element)) {
    return;
  }

  translateAttributes(element);

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      return parent && !shouldSkipElement(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text);
    node = walker.nextNode();
  }

  element.querySelectorAll('[aria-label], [title]').forEach(translateAttributes);
}

function translateTextNode(node: Text): void {
  const source = originalTextByNode.get(node) ?? node.data;
  const trimmed = source.trim();

  if (!trimmed) {
    return;
  }

  if (!originalTextByNode.has(node)) {
    originalTextByNode.set(node, source);
  }

  const translated = translateString(trimmed);
  const nextData = source.replace(trimmed, translated);
  if (node.data !== nextData) {
    node.data = nextData;
  }
}

function translateAttributes(element: Element): void {
  translatedAttributes.forEach((attribute) => {
    const value = getOriginalAttribute(element, attribute);
    if (!value) {
      return;
    }

    const translated = translateString(value.trim());
    const nextValue = value.replace(value.trim(), translated);
    if (element.getAttribute(attribute) !== nextValue) {
      element.setAttribute(attribute, nextValue);
    }
  });
}

function getOriginalAttribute(element: Element, attribute: string): string | null {
  const value = element.getAttribute(attribute);
  if (!value) {
    return null;
  }

  let attributes = originalAttributeByElement.get(element);
  if (!attributes) {
    attributes = new Map();
    originalAttributeByElement.set(element, attributes);
  }

  if (!attributes.has(attribute)) {
    attributes.set(attribute, value);
  }

  return attributes.get(attribute) ?? value;
}

function translateString(value: string): string {
  if (i18n.language !== 'en') {
    return value;
  }

  return legacyTextTranslations[value] ?? value;
}

function shouldSkipElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'script' ||
    tagName === 'style' ||
    tagName === 'code' ||
    tagName === 'pre' ||
    element.hasAttribute('data-i18n-ignore')
  );
}
