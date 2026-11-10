import { makeGroundedFallbackQuestion } from "@/lib/evidence";
import type { InterviewAnswer, InterviewQuestion } from "@/lib/types";

export const INTERVIEW_TOTAL_STEPS = 8;

type InterviewStage = {
  eyebrow: string;
  goal: string;
  helper: string;
  question: string;
  suggestions: string[];
  signal: RegExp;
};

export const INTERVIEW_STAGES: InterviewStage[] = [
  {
    eyebrow: "谁在经历",
    goal: "先确认最近一次真实经历里的具体角色，不追问场景、原因或解决办法。",
    question: "最近一次遇到这个问题的人是谁？",
    helper: "写一个具体的人或角色，例如准备面试的学生、第一次做产品的同事。",
    suggestions: ["准备面试的学生", "第一次做产品的新人", "需要向投资人演示的独立开发者"],
    signal: /(谁|哪个人|哪类人|哪种人|角色|学生|用户|同事|朋友|新人)/i,
  },
  {
    eyebrow: "当时在做什么",
    goal: "承接上一轮回答，只确认那个人当时正在完成的任务或场景。",
    question: "当时他正在做什么？",
    helper: "只写当时在做的一件事，例如整理作品集、准备汇报、测试一个流程。",
    suggestions: ["正在准备面试作品集", "正在整理产品演示", "正在试着做出可点击页面"],
    signal: /(当时|正在|做什么|任务|场景|准备|整理|演示|测试|完成)/i,
  },
  {
    eyebrow: "哪一步卡住",
    goal: "承接上一轮回答，只确认最麻烦、最容易卡住的一个步骤。",
    question: "哪一步最麻烦、最容易卡住？",
    helper: "只写一个步骤，例如找不到人做页面、提交代码失败、演示无法点击。",
    suggestions: ["找不到愿意帮忙的前端", "Figma 只能做静态页面", "外包报价超出预算"],
    signal: /(哪一步|卡在|卡住|麻烦|难点|阻碍|报错|失败|做不到)/i,
  },
  {
    eyebrow: "怎么凑合",
    goal: "承接上一轮回答，只确认对方当时实际采用的凑合办法或求助对象。",
    question: "当时怎么凑合解决？",
    helper: "写一个实际做法，例如找同学、用 PPT、换工具，或者干脆放弃这一步。",
    suggestions: ["找计算机同学帮忙", "用 Figma 做静态原型", "截图放进 PPT 模拟流程"],
    signal: /(怎么|凑合|替代|办法|工具|方式|找谁|帮忙|求助|试过|只能|放弃|Figma|PPT|外包)/i,
  },
  {
    eyebrow: "后来怎样",
    goal: "承接上一轮回答，只确认那次经历后来发生了什么结果。",
    question: "后来发生了什么？",
    helper: "只写最后结果，例如没做成、暂时绕过、换了工具，或者只能凑合演示。",
    suggestions: ["只能用静态图片演示", "放弃可点击原型", "花钱找人做了一部分"],
    signal: /(后来|结果|最后|最终|完成|放弃|成功|失败|做成|没做成|只能)/i,
  },
  {
    eyebrow: "花了多久",
    goal: "承接上一轮回答，只确认这件事实际花掉的时间。",
    question: "这件事一共花了多久？",
    helper: "尽量写一个时长，例如 3 个晚上、6 小时、两天。",
    suggestions: ["花了 6～7 小时", "花了 3 个晚上", "额外花钱找人做页面"],
    signal: /(多久|多少时间|时长|花了|小时|分钟|晚上|天|周)/i,
  },
  {
    eyebrow: "多久一次",
    goal: "承接上一轮回答，只确认最近一个月的大致发生次数。",
    question: "过去一个月发生过几次？",
    helper: "写一个大概次数即可，没有精确记录也可以估算。",
    suggestions: ["只发生过一次", "一个月两三次", "几乎每周都会遇到"],
    signal: /(几次|频率|多久|重复|经常|每周|每月|一个月|过去)/i,
  },
  {
    eyebrow: "最危险判断",
    goal: "基于全部回答，只追问一个如果判断错误、最可能让方向失效的前提。",
    question: "哪个判断如果错了最危险？",
    helper: "只选一个最关键的判断，暂时不用解释怎么验证。",
    suggestions: ["用户其实不需要可点击原型", "自然语言生成仍然太慢", "用户不愿意改变现有演示方式"],
    signal: /(假设|风险|如果.*(错|不成立)|前提|判断|最危险)/i,
  },
];

export function getFallbackQuestion(step: number, history: InterviewAnswer[] = []): InterviewQuestion {
  const stage = INTERVIEW_STAGES[Math.min(Math.max(step, 0), INTERVIEW_STAGES.length - 1)];
  return makeGroundedFallbackQuestion(step, {
    eyebrow: stage.eyebrow,
    question: stage.question,
    helper: stage.helper,
    suggestions: stage.suggestions,
  }, history);
}