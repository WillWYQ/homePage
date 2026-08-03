---
exp: "001"
title: breathing field
question: can a screen pace your breathing down to sleep?
status: ongoing
poster: /lab/001-breathing-field.svg
method: >-
  整片波场的亮度与振幅挂在同一个 4-7-8 时钟上:吸气 4s 升起,屏息 7s 悬停,
  呼气 8s 沉降。基线亮度每完成一个周期递减一档,仪器沿会话缓慢熄向黑。
  声音(可选)与波场同一时钟:吸气渐强、呼气渐弱。
observation: >-
  闭眼也能跟——亮度透过眼睑可见,声音可关。基线递减让"跟到后面越来越暗"
  成为熄向睡眠的物理隐喻。遗忘不发声,这里也不需要。
instruments:
  - simplex-noise(波场)
  - Web Audio(可选呼吸音,lib/audio.ts)
  - canvas 2d
---
