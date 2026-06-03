# Beany Model — 硬件团队对接文档

> 提交时间：2026-06-03
> 前端演示：`model-io.html`（可通过 GitHub Pages 访问）

---

## 一、我们先做了什么

### 1.1 前端演示页面

打开 `model-io.html`，点「模拟一天」逐步查看数据流：

| 步骤 | 内容 | 协议对应 |
|:-----|:-----|:---------|
| ① 事件上报 | 一天 7 条交互事件，标注 9 字节协议字段 | `PetInteractionEvent` |
| ② 8 比例 | 从事件聚合行为特征 | 模型内部 |
| ③ 五行投票 | 投票→±5%→相生 | 模型内部 |
| ④ 5-axis | 权重变化×映射矩阵→新性格 | 模型内部 |
| ⑤ 新快照+查表 | 11 字节快照 + 7 字节查表行，标注协议字段 | `PetGrowthSnapshot` + `PetBehaviorLookupTable` |

底部还有 **模型库接口定义卡**，包含：
- 状态性说明
- 需存档数据量（约 1.1 KB）
- 完整输入/输出参数列表
- KMM Kotlin 方法签名

### 1.2 协议适配

对照 `Beany_宠物设备与App通信数据结构定义-v0.2.md` + `Beany行为表AMZ_20260519.xlsx`，已确认：

| 结构 | 状态 |
|:-----|:-----|
| `PetInteractionEvent`（9 字节） | 已适配，event_id / emotion / context 映射表已设计 |
| `PetGrowthSnapshot`（11 字节） | 已适配，weights×255→wu_xing[5] |
| `PetBehaviorLookupTable`（7×N 字节） | 已适配，LLM 编译查表行 |
| `PetSocialEncounterRecordList` | 已保留空列表接口 |
| `PetDailyStory` | App 本地存储，不走 BLE |

**五行排序已对齐：金→木→水→火→土（与 xlsx 一致）**

### 1.3 30 天养成周期

页面底部包含完整的 30 天养成互动演示，含三种结局：
- **重生**：清零重新培育
- **续养**：进入 Stable 稳定期，权重永久冻结
- **转世**：放弃今生，回到前世选中那天走到 Day 30

---

## 二、你们需要做的事

### 2.1 必须完成（阻塞联调）

| 事项 | 优先级 | 说明 |
|:-----|:------:|:-----|
| **冻结 `PetEmotionState` 枚举值** | 🔴 | xlsx 情绪表已有：1=开心 2=平静 3=悲伤，需写进协议文档 |
| **定义完整的 `action_id`→物理动作库** | 🔴 | xlsx 舵机动作表已有 131 个动作 ID，请确认最终版并提供文档 |
| **定义 `sound_id` 音效库** | 🟡 | xlsx 声音表已有 32 个 wav，确认 ID 与文件映射 |
| **定义 `vibration_id` 震动模式** | 🟡 | xlsx 震动表已有 3 级，确认即可 |

### 2.2 建议确认

| 事项 | 说明 |
|:-----|:-----|
| `milestone` 占位字段（快照 2B） | 我们暂填 0，等待双方定义里程碑 ID 表 |
| `context_mask` 光照/虚弱位 | 模拟无真实传感器，App 端填 0x00（ANY），设备端照常检测 |

---

## 三、我们需要改什么

| 改动 | 状态 | 计划 |
|:-----|:----|:----|
| 4 张映射表（eventType→event_id, mood→emotion, action→action_id, stage→stage_id） | 待完成 | 封装进 KMM 模型库 |
| 8 比例计算器（从 event batch 算 daily ratios） | 待完成 | 封装进 KMM 模型库 |
| 查表编译器（LLM 输出→BehaviorLookupItem 字节行） | 待完成 | 封装进 KMM 模型库 |
| 快照序列化（weights ×255 + 字节打包） | 待完成 | 封装进 KMM 模型库 |

---

## 四、数据流图

```
设备传感器 → PetInteractionEventBatch → App
                                              │
                                          [8 比例计算]
                                              │
                                         [五行投票引擎]
                                              │
                                    ┌─────────┴──────────┐
                                    │                    │
                              PetGrowthSnapshot    PetBehaviorLookupTable
                              (11B 写回设备)        (7×N B 写回设备)
                                                    │
                                              设备查表匹配
                                              加权随机执行
                                                    │
                                            action_id + sound_id + vibration_id
```

---

## 五、联系方式

如有问题请联系 Sienna。
