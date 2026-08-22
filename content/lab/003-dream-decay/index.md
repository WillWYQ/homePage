---
exp: "003"
title: dream decay
question: at which retelling does a dream go missing?
status: ongoing
poster: /lab/003-dream-decay.svg
method: >-
  写下一段梦,只存这台浏览器的 localStorage,不上传、不联网。每次重新
  打开这个实验页就是一次复述,自动触发一次衰减:约 15% 的词变成乱码
  或彻底消失,下限是原文 20% 的词仍然可读,首句保留一个锚点词。衰减
  不可逆、也不可被叫停——遗忘不是访客能主动选择要不要发生的事。
observation: >-
  遗忘本身不发出任何声音。这也是内容,不是留白。
instruments:
  - localStorage(仅本地,不上传、不联网)
  - 字符抖动(反向驱动 encrypted-text.tsx 的技术:清晰→乱码,不是乱码→清晰)
---
