---
exp: "002"
title: tonight's tides
question: what time will I wake up tonight, least badly?
status: ongoing
poster: /lab/002-tonight-tides.svg
method: >-
  就寝时间起横向铺开 9 小时,每 90 分钟一个睡眠周期(含 14 分钟入睡缓冲),
  振幅按周期深浅曲线走——第一个周期最深,之后逐周期变浅、REM 占比上升。
  浅睡窗口是边界 ±10 分钟的区间高亮,不是精确的单点;bedtime 默认取此刻
  本地时间("如果现在上床"),数字本身可用方向键微调、点击后可键入覆盖。
observation: >-
  这是基于人群平均 90 分钟周期的启发式模型,不是这位访客的个人睡眠实测
  数据;真实周期时长因人而异、因夜而异(压力、酒精、时差都会改变它)。
instruments:
  - simplex-noise(潮汐场,与 EXP-001 同源手法、不同参数化)
  - canvas 2d
---
