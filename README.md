# strategy-simulator-2d

* 作戦検討シミュレーターby21nakakou
* 起動方法はmain.shを参照
* ローカルで起動するとhttp://localhost:3000でアクセスできる

## api

例: Python
```python
import requests
auth = requests.auth.HTTPBasicAuth("21hoge", "パスワード")

def er_move_up():
	requests.post("http://シミュレータのurl/send", json={"id": 赤id, "ERX": 10}, auth=auth)
	# ERX, ERY, RRX, RRY: 移動距離 を指定
	# 距離の単位はcm
	# フィールド図左上が原点、下=y正、右=x正

def er_throw(tx, ty):
	requests.post("http://シミュレータのurl/send", json={
		"id": 赤id,
		"ERThrow":{
			"targetPos": {"x": tx, "y": ty}, # 単位 cm
			"speed": 0.2, # 単位 cm / ms (= 10m/s)
			"diffRate": 0.03, # 投擲距離1cmあたりの投擲の分散(cm)
		}
	}, auth=auth)
	# RRが投げる場合RRThrow

sim_data = requests.get("http://シミュレータのurl/get", {"id": 赤id}, auth=auth).json()
# sim_dataの中身(辞書型):
# {
# 	'my': { # 自分
# 		'id': 1,
# 		'ERX': 455,
# 		'ERY': 575,
# 		'ERRing': 19, # 持っているリングの個数
# 		'RRX': 55,
# 		'RRY': 650,
# 		'RRRing': 0,
# 		'ringPos': [ # 全リングの座標(ブラウザに表示用)
# 			{'x': 30, 'y': 30, 'z': 0},
# 			{'x': 30, 'y': 30, 'z': 0},
# 			{'x': 30, 'y': 30, 'z': 0},
# 			...
# 		]
# 	},
# 	'op': { # 相手
# 		'id': 0,
# 		'ERX': 745,
# 		'ERY': 625,
# 		'RRX': 1145,
# 		'RRY': 550,
# 		'ringPos': [
# 			{'x': 1170, 'y': 1170, 'z': 0},
# 			{'x': 1170, 'y': 1170, 'z': 0},
# 			{'x': 1170, 'y': 1170, 'z': 0},
# 			...
# 		]
# 	},
# 	'poleState': [
# 		# state -1=リングが入っていない
# 		#        0=自分がtop ring
# 		#        1=相手がtop ring
# 		# count 入っている個数
# 		# P1L, P1C, P1R, P2L, P2R, P3, OP2L, OP2R, OP1L, OP1C, OP1R の順に11個
# 		{'state': -1, 'count': 0},
# 		{'state': -1, 'count': 0},
# 		{'state': -1, 'count': 0},
# 		...
# 	],
# 	'gameInit': True
# 	# 試合開始しているとTrue
# 	# これがFalseの場合opとpoleStateは無意味な値を返す
# }
```

### ポールの座標
```javascript
const poles = [
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
```
