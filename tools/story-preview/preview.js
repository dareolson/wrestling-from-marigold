import roomUrl from '../../src/assets/story/dressing-room-v1.jpg';
import trainerUrl from '../../src/assets/story/trainer-medium-v1.png';
import cornerUrl from '../../src/assets/story/guido-trainer-corner-v1.jpg';
import aisleUrl from '../../src/assets/story/guido-trainer-aisle-v2.jpg';

const scene = new URLSearchParams(location.search).get('scene');
const corner = scene === 'corner';
const aisle = scene === 'aisle';
document.querySelector('#room').src = aisle ? aisleUrl : corner ? cornerUrl : roomUrl;
document.querySelector('#trainer').src = trainerUrl;
if (aisle) {
    document.title = 'Marigold — Walk to the ring';
    document.body.classList.add('aisle');
    document.querySelector('#trainer').hidden = true;
    document.querySelector('#speaker').hidden = true;
    document.querySelector('#line').hidden = true;
    document.querySelector('#next').textContent = 'To the corner · Enter';
    document.querySelector('#scene').setAttribute('aria-label', 'Guido and his trainer approach the ring through a dark narrow aisle');
    document.querySelector('#room').alt = 'Elevated view of Guido in his torn borrowed robe walking past seated spectators, his trainer half a step behind';
}
if (corner) {
    document.title = 'Marigold — First-match corner';
    document.body.classList.add('corner');
    document.querySelector('#trainer').hidden = true;
    document.querySelector('#scene').setAttribute('aria-label', 'Guido and his trainer in their first-match ring corner');
    document.querySelector('#room').alt = 'Guido listens to his trainer in the ring, wearing a borrowed old robe with a small tear near its hem';
}
// Existing trainer scouting examples, not a new campaign conversation.
const lines = corner ? [
    'Get a little offense in.',
    'Give ’em a reason to cheer.',
] : [
    'Guido, don’t fight him chest to chest. Make him turn first.',
    'He wants that left arm. Give him the wrist, then take the elbow.',
];
let index = 0;
const line = document.querySelector('#line');
line.textContent = lines[index];
function next() {
    if (aisle) { location.assign('?scene=corner'); return; }
    index = (index + 1) % lines.length; line.textContent = lines[index];
}
document.querySelector('#next').addEventListener('click', next);
document.addEventListener('keydown', event => {
    if (event.repeat || !['Enter', 'Space'].includes(event.code) || event.target.closest('button')) return;
    event.preventDefault(); next();
});
document.querySelector('#replay').addEventListener('click', () => {
    document.querySelector('#world').getAnimations().forEach(animation => {
        animation.currentTime = 0; animation.play();
    });
});
