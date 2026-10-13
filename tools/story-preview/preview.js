import roomUrl from '../../src/assets/story/dressing-room-v1.jpg';
import trainerUrl from '../../src/assets/story/trainer-medium-v1.png';

document.querySelector('#room').src = roomUrl;
document.querySelector('#trainer').src = trainerUrl;
// Existing trainer scouting examples, not a new campaign conversation.
const lines = [
    'Guido, don’t fight him chest to chest. Make him turn first.',
    'He wants that left arm. Give him the wrist, then take the elbow.',
];
let index = 0;
const line = document.querySelector('#line');
line.textContent = lines[index];
function next() { index = (index + 1) % lines.length; line.textContent = lines[index]; }
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
