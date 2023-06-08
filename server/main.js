const express = require("express");

const app = express();
app.use(express.static("../vite/dist"));
app.use(express.json());
app.use(express.text());

const initTime = new Date();

const poles = [ //相手から見ると逆順になるようにする
  {
    x: 280,
    y: 280,
    score: [10, 25],
    capacity: 10
  },
  {
    x: 280,
    y: 600,
    score: [10, 25],
    capacity: 10
  },
  {
    x: 280,
    y: 920,
    score: [10, 25],
    capacity: 10
  },
  {
    x: 470,
    y: 470,
    score: [30, 30],
    capacity: 10
  },
  {
    x: 470,
    y: 730,
    score: [30, 30],
    capacity: 10
  },
  {
    x: 600,
    y: 600,
    score: [70, 70],
    capacity: 15
  },
  {
    x: 730,
    y: 470,
    score: [30, 30],
    capacity: 10
  },
  {
    x: 730,
    y: 730,
    score: [30, 30],
    capacity: 10
  },
  {
    x: 920,
    y: 280,
    score: [25, 10],
    capacity: 10
  },
  {
    x: 920,
    y: 600,
    score: [25, 10],
    capacity: 10
  },
  {
    x: 920,
    y: 920,
    score: [25, 10],
    capacity: 10
  },
]

const ringCount = 40;

let team = [];
let game = [];
class Team {
  id = -1;
  ERX = 55;
  ERY = 575;
  RRX = 55;
  RRY = 650;
  ERRing = 0;
  RRRing = 0;
  ringPos = Array.from(Array(40), (a, i) => {
    if (i < 10) {
      return {
        x: 30,
        y: 30,
        z: 0,
      }
    } else if (i < 20) {
      return {
        x: 30,
        y: 1170,
        z: 0,
      }
    } else {
      return {
        x: 425,
        y: 600,
        z: 0,
      }
    }
  });
  //0=ロボットが把持 1=飛んでる 2=着地した 3=ポール上にある
  ringState = Array.from(Array(40), (a) => (2));
  ringVel = Array.from(Array(40), (a) => ({
    x: 0,
    y: 0
  }));
  ringTargetPos = Array.from(Array(40), (a) => ({
    x: 0,
    y: 0
  }));
  gid = undefined;
  lastUpdate = new Date();
  getOp() {
    if (this.gid == undefined) return new Team();
    if (game[this.gid].tid[0] == this.id) {
      return team[game[this.gid].tid[1]];
    } else {
      return team[game[this.gid].tid[0]];
    }
  }
  getPoleState() {
    if (this.gid == undefined) return Array.from(new Array(11), (a) => ({
      state: -1,
      count: 0
    }));
    if (game[this.gid].tid[0] == this.id) {
      return game[this.gid].poleState;
    } else {
      return game[this.gid].poleState.slice().reverse().map((p) => {
        if (p.state === -1) return {
          state: -1,
          count: p.count
        };
        if (p.state === 0) return {
          state: 1,
          count: p.count
        };
        if (p.state === 1) return {
          state: 0,
          count: p.count
        };
      });
    }
  }
  setPoleState(j, p) {
    if (game[this.gid].tid[0] == this.id) {
      game[this.gid].poleState[j] = p;
    } else {
      if (p.state === -1) game[this.gid].poleState[10 - j] = {
        state: -1,
        count: p.count
      };
      if (p.state === 0) game[this.gid].poleState[10 - j] = {
        state: 1,
        count: p.count
      };
      if (p.state === 1) game[this.gid].poleState[10 - j] = {
        state: 0,
        count: p.count
      };
    }
  }
}
class Game {
  tid = [undefined, undefined];
  poleState = Array.from(Array(11), (a) => ({
    state: -1,
    count: 0,
  }));
  initTime = new Date();
}

function getDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
}

//Javascriptで正規分布 https://qiita.com/kyonsi/items/579a61edab661f27e3a5
function normalDistribution(sd, mean) {
  var x = Math.random();
  var y = Math.random();

  var z1 = Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y);
  var z2 = Math.sqrt(-2 * Math.log(x)) * Math.sin(2 * Math.PI * y);

  return {
    z1: mean + z1 * sd,
    z2: mean + z2 * sd
  };
}

//投擲開始
function throwRing(id, isRR, targetPos, speed, diffRate) {
  let t = team[id];
  if (isRR && t.RRRing === 0) return false;
  if (!isRR && t.ERRing === 0) return false;
  console.log("throw")
  for (let i = 0; i < ringCount; i++) {
    if (t.ringState[i] === 0) {
      let start;
      if (isRR) {
        start = {
          x: t.RRX,
          y: t.RRY,
          z: 0
        };
      } else {
        start = {
          x: t.ERX,
          y: t.ERY,
          z: 0
        };
      }
      let end = {
        x: targetPos.x,
        y: targetPos.y
      };
      let diff = {
        x: end.x - start.x,
        y: end.y - start.y
      };
      let distance = getDistance(start, end);
      let dist = normalDistribution(distance * diffRate, 0);
      end.x += dist.z1;
      end.y += dist.z2;
      diff = {
        x: end.x - start.x,
        y: end.y - start.y
      };
      distance = getDistance(start, end);
      t.ringPos[i] = start;
      t.ringPos[i].z = new Date().getTime() - initTime.getTime();
      t.ringVel[i] = {
        x: diff.x / distance * speed,
        y: diff.y / distance * speed
      };
      t.ringTargetPos[i] = end;
      t.ringState[i] = 1;
      if (isRR) t.RRRing--;
      else t.ERRing--;
      return true;
    }
  }
  return false;
}

function updateRing(id) {
  let t = team[id];
  const dt = new Date().getTime() - t.lastUpdate.getTime();
  t.lastUpdate = new Date();
  for (let i = 0; i < ringCount; i++) {
    if (t.ringState[i] === 1) {
      if ((t.ringPos[i].x - t.ringTargetPos[i].x) * (t.ringPos[i].x + t.ringVel[i].x * dt - t.ringTargetPos[i].x) < 0 ||
        (t.ringPos[i].y - t.ringTargetPos[i].y) * (t.ringPos[i].y + t.ringVel[i].y * dt - t.ringTargetPos[i].y) < 0) {
        t.ringPos[i] = t.ringTargetPos[i];
        t.ringPos[i].z = new Date().getTime() - initTime.getTime();

        t.ringState[i] = 2;

        //リングがポールに乗ったか?
        const poleState = t.getPoleState();
        // console.log(poleState);
        for (let j = 0; j < poles.length; j++) {
          if (getDistance(t.ringPos[i], poles[j]) < 20 && poleState[j].count < poles[j].capacity) {
            t.setPoleState(j, {
              state: 0,
              count: poleState[j].count + 1
            });
            t.ringState[i] = 3;
            break;
          }
        }
      } else {
        t.ringPos[i].x += t.ringVel[i].x * dt;
        t.ringPos[i].y += t.ringVel[i].y * dt;
        t.ringPos[i].z = new Date().getTime() - initTime.getTime();
      }

    } else if (t.ringState[i] === 2) {
      if (getDistance(t.ringPos[i], {
          x: t.ERX,
          y: t.ERY
        }) < 50 + 12.5) {
        t.ringPos[i] = {
          x: -100,
          y: -100,
          z: -1
        };
        t.ringState[i] = 0;
        t.ERRing++;
      } else if (getDistance(t.ringPos[i], {
          x: t.RRX,
          y: t.RRY
        }) < 25 + 12.5) {
        t.ringPos[i] = {
          x: -100,
          y: -100,
          z: -1
        };
        t.ringState[i] = 0;
        t.RRRing++;
      }
    }
  }
}

//クライアントからゲームの情報を受け取る
app.post("/send", (req, res) => {
  // console.log(req.body);
  let body = req.body;
  if (typeof body === "string") body = JSON.parse(req.body);
  let id = parseInt(body.id);
  if (id < 0 || id >= team.length) {
    res.send("");
    return;
  }
  let t = team[id];
  let ret = {};
  // console.log(body);
  if (body.ERX != undefined) t.ERX += body.ERX;
  if (body.ERY != undefined) t.ERY += body.ERY;
  if (body.RRX != undefined) t.RRX += body.RRX;
  if (body.RRY != undefined) t.RRY += body.RRY;
  if (body.ERThrow != undefined) {
    ret.ERThrow = throwRing(id, false, body.ERThrow.targetPos, body.ERThrow.speed, body.ERThrow.diffRate);
  }
  if (body.RRThrow != undefined) {
    ret.RRThrow = throwRing(id, true, body.RRThrow.targetPos, body.RRThrow.speed, body.RRThrow.diffRate);
  }
  res.send(JSON.stringify(ret));
});

app.get("/get", (req, res) => {
  // console.log(req.query);
  id = parseInt(req.query.id);
  if (id < 0 || id >= team.length) {
    res.send("");
    return;
  }
  updateRing(id);
  const t = team[id];
  const op = t.getOp();
  // console.log(t);
  res.send(JSON.stringify({
    my: {
      id: t.id,
      ERX: t.ERX,
      ERY: t.ERY,
      ERRing: t.ERRing,
      RRX: t.RRX,
      RRY: t.RRY,
      RRRing: t.RRRing,
      ringPos: t.ringPos,
    },
    op: {
      id: op.id,
      ERX: 1200 - op.ERX,
      ERY: 1200 - op.ERY,
      // ERRing: op.ERRing,
      RRX: 1200 - op.RRX,
      RRY: 1200 - op.RRY,
      // RRRing: op.RRRing,
      ringPos: op.ringPos.map((p) => ({
        x: p.x >= 0 ? 1200 - p.x : -100,
        y: p.y >= 0 ? 1200 - p.y : -100,
        z: p.z
      })),
    },
    poleState: t.getPoleState(),
    gameInit: t.gid != undefined,
    // initTime: t.game == undefined ? new Date().toJSON() : game[t.game].initTime,
  }));
});
app.get("/new", (req, res) => {
  const newId = team.length;
  let t = new Team();
  t.id = newId;
  team.push(t);
  res.send(JSON.stringify({
    id: newId
  }));
});
app.get("/reset", (req, res) => {
  let id = parseInt(req.query.id);
  let opId = parseInt(req.query.opId);
  if (id < 0 || id >= team.length || opId < 0 || opId >= team.length) {
    res.send("");
    return;
  }
  team[id] = new Team();
  team[id].id = id;
  team[opId] = new Team();
  team[opId].id = opId;
  if (id === opId || team[id].gid !== team[opId].gid) {
    res.send("");
    console.log(`reset tid=[${id}, ${opId}]`);
    return;
  }
  let newGameId = game.length;
  let g = new Game();
  g.tid[0] = id;
  g.tid[1] = opId;
  game.push(g);
  team[id].gid = newGameId;
  team[opId].gid = newGameId;
  console.log(`reset gid=${newGameId} tid=[${id}, ${opId}]`);
  res.send("");
});


app.listen(3000);
