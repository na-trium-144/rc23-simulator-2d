import { useState, useEffect } from 'react'
import fieldImg from './assets/field.jpg'
import './App.css'

// 1px=10mm
function App() {
  const [keys, setKeys] = useState([]);
  const [teamID, setTeamID] = useState(-1);
  const [opTeamID, setOpTeamID] = useState(-1);
  const [gameInit, setGameInit] = useState(false);

  const nextGame = async () => {
    await fetch("/reset?id=" + teamID + "&opId=" + opTeamID);
  };
  const newGame = async () => {
    const res = await fetch("/new");
    const getData = await res.json();
    setTeamID(getData.id);
    setOpTeamID(getData.id);
  };
  useEffect(() => { newGame(); }, [])

  const [ERX, setERX] = useState(55);
  const [ERY, setERY] = useState(575);
  const [RRX, setRRX] = useState(55);
  const [RRY, setRRY] = useState(650);
  const [ERRing, setERRing] = useState(0);
  const [RRRing, setRRRing] = useState(0);
  const [moveSpeed, setMoveSpeed] = useState("1");
  const [throwSpeed, setThrowSpeed] = useState("2");
  const [throwERMaxDistance, setThrowERMaxDistance] = useState("5");
  const [throwRRMaxDistance, setThrowRRMaxDistance] = useState("5");
  const [throwDiff, setThrowDiff] = useState("3");
  const [throwInterval, setThrowInterval] = useState("3");
  const [throwNum, setThrowNum] = useState("2");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [lastThrowTime, setLastThrowTime] = useState([new Date()]);
  const ringCount = 40;
  const [ringPos, setRingPos] = useState(Array.from(Array(ringCount), (a) => ({ x: 100, y: 100, z: undefined })));
  const poles = [ //相手から見ると逆順になるようにする
    { x: 280, y: 280, score: [10, 25], capacity: 10 },
    { x: 280, y: 600, score: [10, 25], capacity: 10 },
    { x: 280, y: 920, score: [10, 25], capacity: 10 },
    { x: 470, y: 470, score: [30, 30], capacity: 10 },
    { x: 470, y: 730, score: [30, 30], capacity: 10 },
    { x: 600, y: 600, score: [70, 70], capacity: 15 },
    { x: 730, y: 470, score: [30, 30], capacity: 10 },
    { x: 730, y: 730, score: [30, 30], capacity: 10 },
    { x: 920, y: 280, score: [25, 10], capacity: 10 },
    { x: 920, y: 600, score: [25, 10], capacity: 10 },
    { x: 920, y: 920, score: [25, 10], capacity: 10 },
  ]
  //-1=無 0=赤 1=青
  const [poleState, setPoleState] = useState(Array.from(Array(poles.length), (a) => ({ state: -1, count: 0 })));

  const [opERX, setOpERX] = useState(55);
  const [opERY, setOpERY] = useState(575);
  const [opRRX, setOpRRX] = useState(55);
  const [opRRY, setOpRRY] = useState(650);
  const [opRingPos, setOpRingPos] = useState(Array.from(Array(ringCount), (a) => ({ x: 100, y: 100, z: undefined })));

  const onKeyDown = (event) => {
    if (keys.find((c) => (c === event.code)) == undefined) {
      keys.push(event.code);
      setKeys(keys);
    }
  };
  const onKeyUp = (event) => {
    setKeys(keys.filter((c) => (c !== event.code)));
  };
  const onMouseMove = (event) => {
    setMousePos({ x: event.pageX - 0, y: event.pageY - 0 });
  };

  // let sendDataOld = Object.assign({}, sendData);
  // setSendData({ id: teamID });
  // const res = await fetch("/send", {
  //   method: "POST",
  //   header: {
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify(sendDataOld),
  // });

  //受信
  const [recvTrigger, setRecvTrigger] = useState();
  useEffect(() => {
    const recv = async () => {
      const res = await fetch("/get?id=" + teamID);
      const getData = await res.json();
      setERX(getData.my.ERX);
      setERY(getData.my.ERY);
      setRRX(getData.my.RRX);
      setRRY(getData.my.RRY);
      setERRing(getData.my.ERRing);
      setRRRing(getData.my.RRRing);
      setRingPos(getData.my.ringPos);

      setOpERX(getData.op.ERX);
      setOpERY(getData.op.ERY);
      setOpRRX(getData.op.RRX);
      setOpRRY(getData.op.RRY);
      setOpRingPos(getData.op.ringPos);

      setPoleState(getData.poleState);
      setGameInit(getData.gameInit);
      if (getData.gameInit) {
        setTeamID(getData.my.id);
        setOpTeamID(getData.op.id);
      }
    };
    recv();
    setTimeout(() => {
      setRecvTrigger(new Date());
    }, 100);
  }, [recvTrigger]);

  function getDistance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
  }

  const [mainLoopTrigger, setMainLoopTrigger] = useState();
  //投擲したリングの処理 & リング拾い
  useEffect(() => {
    const handleEv = async () => {
      let sendData = {
        id: teamID,
        ERX: 0,
        ERY: 0,
        RRX: 0,
        RRY: 0,
        ERThrow: undefined,
        RRThrow: undefined,
      };
      //投擲間隔をチェック、問題なければtrue返し投擲
      const checkThrowInterval = () => {
        for (let i = 0; i < parseInt(throwNum); i++) {
          if (lastThrowTime.length <= i) {
            return true;
          }
          if (lastThrowTime[i] == undefined || (new Date().getTime() - lastThrowTime[i].getTime()) / 1000 > parseFloat(throwInterval)) {
            // lastThrowTime[i] = new Date();
            return true;
          }
        }
        return false;
      };
      const updateThrowTime = () => {
        setLastThrowTime((lastThrowTime) => {
          lastThrowTime = lastThrowTime.slice();
          for (let i = 0; i < parseInt(throwNum); i++) {
            if (lastThrowTime.length <= i) {
              lastThrowTime.push(new Date());
              break;
            }
            if ((new Date().getTime() - lastThrowTime[i].getTime()) / 1000 > parseFloat(throwInterval)) {
              lastThrowTime[i] = new Date();
              break;
            }
          }
          return lastThrowTime;
        });
      };


      // console.log(keys);
      for (const c of keys) {
        const speed = parseFloat(moveSpeed) * 0.050 * 100;
        if (c == "KeyW") sendData.ERY = -speed;
        if (c == "KeyA") sendData.ERX = -speed;
        if (c == "KeyS") sendData.ERY = speed;
        if (c == "KeyD") sendData.ERX = speed;
        if (c == "KeyI") sendData.RRY = -speed;
        if (c == "KeyJ") sendData.RRX = -speed;
        if (c == "KeyK") sendData.RRY = speed;
        if (c == "KeyL") sendData.RRX = speed;
        if (c == "KeyZ") {
          if (getDistance({ x: ERX, y: ERY }, mousePos) < parseFloat(throwERMaxDistance) * 100) {
            if (checkThrowInterval()) {
              sendData.ERThrow = {
                targetPos: mousePos,
                speed: parseFloat(throwSpeed) * 0.001 * 100,
                diffRate: parseFloat(throwDiff) / 100,
              };
            }
          }
        }
        if (c == "KeyM") {
          if (getDistance({ x: RRX, y: RRY }, mousePos) < parseFloat(throwRRMaxDistance) * 100) {
            if (checkThrowInterval()) {
              sendData.RRThrow = {
                targetPos: mousePos,
                speed: parseFloat(throwSpeed) * 0.001 * 100,
                diffRate: parseFloat(throwDiff) / 100,
              };
            }
          }
        }
      }
      if (keys.find((c) => (c === "KeyZ" || c === "KeyM")) != undefined) {
        setKeys(keys.filter((c) => (c !== "KeyZ" && c !== "KeyM")));
      }

      if (!(sendData.ERX === 0 &&
        sendData.ERY === 0 &&
        sendData.RRX === 0 &&
        sendData.RRY === 0 &&
        sendData.RRThrow == undefined &&
        sendData.ERThrow == undefined)) {
        const res = await fetch("/send", {
          method: "POST",
          header: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sendData),
        });
        const resData = await res.json();
        if (resData.ERThrow != undefined) updateThrowTime();
        if (resData.RRThrow != undefined) updateThrowTime();
      }
    };
    handleEv();
  }, [mainLoopTrigger]);
  useEffect(() => {
    setInterval(() => { setMainLoopTrigger(new Date()); }, 50);
  }, []);

  return (
    <div className="App">
      <div className="field">
        <img src={fieldImg} width="1200" height="1200" />
        <input className="field-button" value="" onKeyDown={onKeyDown} onKeyUp={onKeyUp} onMouseMove={onMouseMove}>
        </input>
        <div className="object er border-red" style={{ top: ERY - 50, left: ERX - 50 }}>
          ER
          <span style={{ color: "red" }}>x{ERRing}</span>
        </div>
        <div className="object rr border-red" style={{ top: RRY - 25, left: RRX - 25 }}>
          RR
          <span style={{ color: "red" }}>x{RRRing}</span>
        </div>
        <div className="object throw-area" style={{ top: ERY - parseFloat(throwERMaxDistance) * 100, left: ERX - parseFloat(throwERMaxDistance) * 100, width: parseFloat(throwERMaxDistance) * 2 * 100, height: parseFloat(throwERMaxDistance) * 2 * 100 }} />
        <div className="object throw-area" style={{ top: RRY - parseFloat(throwRRMaxDistance) * 100, left: RRX - parseFloat(throwRRMaxDistance) * 100, width: parseFloat(throwRRMaxDistance) * 2 * 100, height: parseFloat(throwRRMaxDistance) * 2 * 100 }} />
        {
          Array.from(Array(ringCount), (a, i) => (
            <div className="object ring border-red" key={i} style={{ top: ringPos[i].y - 12.5, left: ringPos[i].x - 12.5, zIndex: ringPos[i].z }}></div>
          ))
        }
        {
          Array.from(poles, (pole, i) => (
            <div className="object" key={i} style={{ color: poleState[i].state === 0 ? "red" : "blue", top: pole.y + 10, left: pole.x + 10 }}>
              {poleState[i].count > 0 && poleState[i].count + " / " + pole.capacity}
            </div>
          ))
        }
        <div className="object er border-blue" style={{ top: opERY - 50, left: opERX - 50 }}>
          ER
        </div>
        <div className="object rr  border-blue" style={{ top: opRRY - 25, left: opRRX - 25 }}>
          RR
        </div>
        {
          Array.from(Array(ringCount), (a, i) => (
            <div className="object ring border-blue" key={i} style={{ top: opRingPos[i].y - 12.5, left: opRingPos[i].x - 12.5, zIndex: opRingPos[i].z }}></div>
          ))
        }
      </div>
      <div className="right-pane">
        <button onClick={() => { nextGame(); }}>{gameInit || teamID === opTeamID ? "リセット" : "スタート"}</button>
        <table className="scoretable">
          <tbody>
            <tr>
              <th>
                赤 id:
                <input
                  value={teamID}
                  size="3"
                  onChange={(e) => { setTeamID(e.target.value); }}
                />
              </th>
              <th>vs</th>
              <th>
                青 id:
                <input
                  value={opTeamID}
                  size="3"
                  onChange={(e) => { setOpTeamID(e.target.value); }}
                  disabled={gameInit}
                />
              </th>
            </tr>
            <tr>
              <td>{gameInit && poleState.reduce((prev, cur, i) => (prev + (cur.state == 0 ? poles[i].score[0] : 0)), 0)}</td>
              <td>-</td>
              <td>{gameInit && poleState.reduce((prev, cur, i) => (prev + (cur.state == 1 ? poles[i].score[1] : 0)), 0)}</td>
            </tr>
            <tr>
              <td style={{ color: "red" }}>
                {poleState.reduce((prev, cur, i) => (prev + (i < 8 && cur.state == 0 ? 1 : 0)), 0) == 8 && "CheyYo達成!"}
              </td>
              <td></td>
              <td style={{ color: "blue" }}>
                {poleState.reduce((prev, cur, i) => (prev + (i >= 3 && cur.state == 1 ? 1 : 0)), 0) == 8 && "CheyYo達成!"}
              </td>
            </tr>
          </tbody>
        </table>
        <ul>
          <li>W,A,S,D: ER移動</li>
          <li>Z: マウスカーソルの位置にER投擲</li>
          <li>I,J,K,L: RR移動</li>
          <li>M: マウスカーソルの位置にRR投擲</li>
          <li>落ちているリングやリングゾーンに近づくとリング装填</li>
          <li>味方ロボットにリング投げるとパスが可能</li>
          <li>キーボードが反応しないときはフィールドクリック</li>
        </ul>
        <table className="paramtable">
          <tbody>
            <tr>
              <th>マシン移動速度:</th>
              <td>
                <input value={moveSpeed} size="5" onChange={(e) => { setMoveSpeed(e.target.value); }} />
                m / s
              </td>
            </tr>
            <tr>
              <th>投擲速度:</th>
              <td>
                <input value={throwSpeed} size="5" onChange={(e) => { setThrowSpeed(e.target.value); }} />
                m / s
              </td>
            </tr>
            <tr>
              <th>ER射程:</th>
              <td>
                <input value={throwERMaxDistance} size="5" onChange={(e) => { setThrowERMaxDistance(e.target.value); }} />
                m
              </td>
            </tr>
            <tr>
              <th>RR射程:</th>
              <td>
                <input value={throwRRMaxDistance} size="5" onChange={(e) => { setThrowRRMaxDistance(e.target.value); }} />
                m
              </td>
            </tr>
            <tr>
              <th>投擲の分散(標準偏差):</th>
              <td>
                <input value={throwDiff} size="5" onChange={(e) => { setThrowDiff(e.target.value); }} />
                % × 投擲距離
              </td>
            </tr>
            <tr>
              <th>投擲時間間隔:</th>
              <td>
                <input value={throwInterval} size="5" onChange={(e) => { setThrowInterval(e.target.value); }} />
                s /
                <input value={throwNum} size="2" onChange={(e) => { setThrowNum(e.target.value); }} />
                個投擲可能
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="bottom-pane">
        <p>遊び方</p>
        <ul>
          <li>フィールドがでかすぎる場合はブラウザのズーム機能で縮小してください</li>
          <li>赤が自分、青が相手です</li>
          <li>右上の 赤id が自分のidです ページをリロードすると新しいidが振られます</li>
          <li>複数人で同じチームを操作する場合は 赤id を変更してチーム内で統一してください</li>
          <li>誰か1人が 青id に対戦相手の人の 赤id を入力して スタート を押すと対戦を開始します</li>
          <li>リセット を押すとフィールドがリセットされます</li>
          <li>操作方法は右上を参照</li>
        </ul>
      </div>
    </div>
  )
}

export default App
