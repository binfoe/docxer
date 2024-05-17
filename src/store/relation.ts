export interface DocxRel {
  id: string;
  type: string;
  target: string;
}
export interface XmlRel {
  ':@': {
    Id: string;
    Type: string;
    Target: string;
  };
}
export type RelsStore = Map<string, DocxRel>;
function getType(tp: string) {
  const i = tp.lastIndexOf('/');
  return tp.slice(i + 1);
}
export async function parseRels(xmlRels: { Relationships: XmlRel[] }) {
  const relsStore: RelsStore = new Map();
  xmlRels['Relationships'].forEach((xml) => {
    if (!(xml as { Relationship?: unknown })['Relationship'] || !xml[':@']) return;
    const attrs = xml[':@'];
    const rel = {
      id: attrs.Id,
      type: getType(attrs.Type),
      target: attrs.Target,
    };
    relsStore.set(rel.id, rel);
  });
  return relsStore;
}
