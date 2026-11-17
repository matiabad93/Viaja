import type {Guide} from './curated-guides.ts';

/** One-time import for browsers with the old six-guide catalogue.
 * Preserve user-edited and removed guides; only retire the bundled Alsace
 * sample from public discovery. Custom edits of it remain unpublished in Studio.
 */
export function syncEuropeanGuides(stored:Guide[],bundled:Guide[]):Guide[]{
 const imported=stored.map(guide=>guide.id==='colmar'?{...guide,published:false}:guide)
  .filter(guide=>!(guide.id==='colmar'&&guide.title==='Colmar y Alsacia'));
 const known=new Set(imported.map(guide=>guide.id));
 return [...bundled.filter(guide=>guide.id!=='colmar'&&!known.has(guide.id)),...imported];
}
