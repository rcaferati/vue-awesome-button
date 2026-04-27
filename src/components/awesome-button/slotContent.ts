import {
  Comment,
  Fragment,
  Text,
  computed,
  type ComputedRef,
  type Slots,
  type VNode,
} from 'vue';

export type AwesomeButtonSlotName = 'before' | 'default' | 'after' | 'extra';

export function isMeaningfulVNode(node: VNode | null | undefined): boolean {
  if (!node) {
    return false;
  }

  if (node.type === Comment) {
    return false;
  }

  if (node.type === Text) {
    return String(node.children ?? '').trim().length > 0;
  }

  if (node.type === Fragment) {
    return Array.isArray(node.children)
      ? node.children.some((child) => isMeaningfulVNode(child as VNode))
      : false;
  }

  return true;
}

export function hasMeaningfulSlot(
  slots: Slots,
  name: AwesomeButtonSlotName
): ComputedRef<boolean> {
  return computed(() => {
    const vnodeList = slots[name]?.();
    if (!vnodeList?.length) {
      return false;
    }

    return vnodeList.some((node) => isMeaningfulVNode(node));
  });
}

function collectStringContent(
  node: VNode | null | undefined,
  chunks: string[]
): boolean {
  if (!node || node.type === Comment) {
    return true;
  }

  if (node.type === Text) {
    chunks.push(String(node.children ?? ''));
    return true;
  }

  if (node.type === Fragment) {
    if (!Array.isArray(node.children)) {
      return true;
    }

    return node.children.every((child) =>
      collectStringContent(child as VNode, chunks)
    );
  }

  return false;
}

export function extractStringSlotValueFromNodes(
  vnodeList: VNode[] | undefined
): string | null {
  if (!vnodeList?.length) {
    return null;
  }

  const chunks: string[] = [];
  const isStringOnly = vnodeList.every((node) => collectStringContent(node, chunks));

  if (!isStringOnly) {
    return null;
  }

  const normalized = chunks.join('').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}
