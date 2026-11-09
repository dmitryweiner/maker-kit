import 'maker-kit/styles/kit.css';
import { startView } from './model';
import { greet } from './use';

const out = document.getElementById('out');
if (out) out.textContent = greet({ code: 'hello', params: { name: 'kit' } });

const canvas = document.querySelector('canvas');
if (canvas) startView(canvas);
