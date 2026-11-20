import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const wizard=readFileSync(new URL('../components/guided-planner.tsx',import.meta.url),'utf8');
const feedback=readFileSync(new URL('../components/experience/ai-action-feedback.tsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');

// The previous UX showed the same server error at the top of the page and inside
// the form. A generation error must now have exactly one contextual outlet.
assert.doesNotMatch(page,/className="formcard">\{error&&/);
assert.match(page,/catch\(e\)\{setAiError\(/);
assert.match(page,/setAiError\(feasibility\.blocking\.join\(' '\)\)/);
assert.match(page,/<AIActionFeedback message=\{aiError\} refining=\{Boolean\(result\)\}/);
assert.match(wizard,/<AIActionFeedback message=\{aiError\}\/>/);
assert.match(page,/feedback\.scrollIntoView\(/);
assert.match(page,/feedback\.focus\(\{preventScroll:true\}\)/);
assert.match(feedback,/role="alert" tabIndex=\{-1\}/);
assert.match(feedback,/Tu viaje anterior sigue intacto\./);
assert.match(feedback,/Editar mi pedido/);
assert.match(styles,/html\[data-theme="dark"\] \.ai-action-feedback/);

console.log('Feedback contextual de IA: una sola alerta, foco accesible y modo oscuro — OK');
