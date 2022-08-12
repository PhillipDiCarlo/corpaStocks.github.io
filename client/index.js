var peepee = document.createElement("canvas");

peepee.width = window.innerWidth;
peepee.height = window.innerHeight;

var ctx = peepee.getContext("2d");
let corpa = document.createElement("img");
corpa.src = "https://cdn.7tv.app/emote/612a803421ca87d781a04fd2/4x";

var lois = new Howl({
  src: ["https://jimmyboy.sfo3.cdn.digitaloceanspaces.com/sounds/lois.mp3"],
  html5: true,
});

// ctx.fillStyle = "black";

// ctx.fillRect(0, 0, peepee.width, peepee.height);
var y = peepee.height / 2;
var x = peepee.width / 2 - 100;

var vx = Math.random() * 2 - 1,
  vy = Math.random() * 2 - 1,
  ax = 0,
  ay = 0.0005;

function clear(bool = true) {
  if (bool) {
    let oldCol = ctx.fillStyle;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, peepee.width, peepee.height);
    ctx.fillStyle = oldCol;
  } else {
    ctx.clearRect(0, 0, peepee.width, peepee.height);
  }
}
var prevTime = 0;
var dt = 0;
const CHANCE = 0.05;

/**
 * @type {FrameRequestCallback}
 */
function draw(time) {
  clear(false);
  dt = time - prevTime;
  prevTime = time;
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";

  ctx.drawImage(corpa, x, y, 128, 128);

  x += vx * dt;
  y += vy * dt;

  if (y > peepee.height - 128) {
    vy = -vy;
    y = peepee.height - 128;
    if (Math.random() > CHANCE) lois.play();
  }
  if (y < 0) {
    vy = -vy;
    y = 0;
    if (Math.random() > CHANCE) lois.play();
  }
  if (x > peepee.width - 128) {
    vx = -vx;
    x = peepee.width - 128;
    if (Math.random() > 0.5) lois.play();
  }
  if (x < 0) {
    vx = -vx;
    x = 0;
    if (Math.random() > CHANCE) lois.play();
  }
  window.requestAnimationFrame(draw);
}
Howler.volume(0.5);
window.requestAnimationFrame(draw);

document.body.appendChild(peepee);

setInterval(function () {
  console.log(x, y, dt);
}, 1000);
