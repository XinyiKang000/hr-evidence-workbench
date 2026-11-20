"use strict";

const retail = ["客户需求识别", "处理客户异议", "高客单顾问式销售"];

const demoCases = [
  {
    label: "跨行业零售",
    criteria: retail,
    material: "在运动用品门店负责一线接待。先询问顾客的步行距离和穿着场景，再比较两款鞋的支撑与价格。遇到尺码缺货时，先确认顾客的使用日期，再联系邻店调货。",
    rows: [
      { criterion: retail[0], status: "transferable", quote: "先询问顾客的步行距离和穿着场景", question: "请讲一次你主动发现顾客未明说的需求的经历。你问了什么，后来如何调整推荐？" },
      { criterion: retail[1], status: "transferable", quote: "先确认顾客的使用日期，再联系邻店调货", question: "当顾客不接受调货方案时，你会怎样了解对方的顾虑并提出备选方案？" },
      { criterion: retail[2], status: "gap", quote: "", question: "请选一个顾客对价格有顾虑的例子，说明你如何解释产品价值，以及顾客最后如何决定。" }
    ]
  },
  {
    label: "招聘协调",
    criteria: ["候选人沟通", "跨方排期协调", "流程复盘"],
    material: "为一家学生社团协调招新。候选人临时改期时，我向双方分别确认两个备选时段，并在当天更新共享排期表。面试结束后向候选人发送下一步安排。",
    rows: [
      { criterion: "候选人沟通", status: "direct", quote: "向候选人发送下一步安排", question: "请举例说明你会在候选人通知里写哪些内容，以及如何处理需要延迟反馈的情况？" },
      { criterion: "跨方排期协调", status: "direct", quote: "向双方分别确认两个备选时段，并在当天更新共享排期表", question: "如果候选人和面试官都无法接受备选时段，你会如何推进，并让双方及时获得一致的信息？" },
      { criterion: "流程复盘", status: "gap", quote: "", question: "你会从排期表里如何发现容易造成延迟的环节？可以举一个实际观察或说明你会看哪些信号。" }
    ]
  },
  {
    label: "无来源引文 · 异常样例",
    criteria: retail,
    material: "在社区书店负责接待顾客。询问阅读偏好后向顾客推荐不同主题的书。",
    rows: [
      { criterion: retail[0], status: "transferable", quote: "询问阅读偏好后向顾客推荐不同主题的书", question: "当顾客难以描述偏好时，你会通过哪些问题了解实际需求？" },
      { criterion: retail[1], status: "gap", quote: "", question: "请讲一次顾客拒绝初次推荐的经历，你如何确认原因并处理？" },
      { criterion: retail[2], status: "direct", quote: "曾独立完成万元级销售", question: "你是如何促成这笔高额销售的？" }
    ]
  }
];
