// =====================================================
// Standard IAT (7-block)
// Gender (남성/여성) × Talent vs Effort
// Keys: E = left, I = right
// =====================================================

// ---------- jsPsych init ----------
const jsPsych = initJsPsych({
  on_finish: () => {
    // 개발 단계 확인용 (배포 시 삭제 가능)
    jsPsych.data.displayData("json");
  }
});

const KEYS = { left: "e", right: "i" };

// ---------- Stimuli (FINAL) ----------

// Target categories (gender)
const STIM_MALE = ["남자", "남성"];
const STIM_FEMALE = ["여자", "여성"];

// Attribute categories
const STIM_TALENT = ["재능", "타고난", "천부적", "선천적", "소질"];
const STIM_EFFORT = ["노력", "연습", "훈련", "학습", "연마"];

// ---------- Trial counts (FINAL) ----------
const N_B1 = 20; // gender practice
const N_B2 = 20; // attribute practice
const N_B3 = 20; // combined practice
const N_B4 = 56; // combined test
const N_B5 = 20; // gender switch practice
const N_B6 = 20; // combined practice (reversed)
const N_B7 = 56; // combined test (reversed)

// ---------- Helpers ----------
function instructions(html, name) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div style="max-width:820px;margin:40px auto;font-size:18px;line-height:1.7;">${html}</div>`,
    choices: [" "],
    data: { task: "instructions", name }
  };
}

function makeTrial({ stimulus, correct_response, left_label, right_label, block, stim_class }) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="display:flex;justify-content:space-between;font-size:18px;margin:10px 20px;">
        <div>${left_label}</div>
        <div>${right_label}</div>
      </div>
      <div style="margin-top:70px;font-size:42px;text-align:center;">${stimulus}</div>
    `,
    choices: [KEYS.left, KEYS.right],
    data: {
      task: "IAT",
      block,
      stimulus,
      stim_class,
      correct_response
    },
    on_finish: (data) => {
      data.correct = data.response === correct_response;
    }
  };
}

// error feedback
const errorFeedback = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `<div style="font-size:56px;color:#b00020;">X</div>`,
  choices: "NO_KEYS",
  trial_duration: 250
};

function withErrorFeedback(trial) {
  return {
    timeline: [
      trial,
      {
        timeline: [errorFeedback],
        conditional_function: () => {
          const last = jsPsych.data.get().last(1).values()[0];
          return last && last.correct === false;
        }
      }
    ]
  };
}

// ---------- Block builders ----------
function buildSimpleBlock({ leftStim, rightStim, leftLabel, rightLabel, blockName, nTrials, leftClass, rightClass }) {
  const pool = [
    ...leftStim.map(s => ({ s, key: KEYS.left, cls: leftClass })),
    ...rightStim.map(s => ({ s, key: KEYS.right, cls: rightClass }))
  ];

  const trials = [];
  for (let i = 0; i < nTrials; i++) {
    const item = jsPsych.randomization.sampleWithoutReplacement(pool, 1)[0];
    trials.push(
      withErrorFeedback(
        makeTrial({
          stimulus: item.s,
          correct_response: item.key,
          left_label: leftLabel,
          right_label: rightLabel,
          block: blockName,
          stim_class: item.cls
        })
      )
    );
  }
  return { timeline: trials };
}

function buildCombinedBlock({
  leftTargets, rightTargets, leftAttrs, rightAttrs,
  leftLabel, rightLabel, blockName, nTrials
}) {
  const pool = [
    ...leftTargets.map(s => ({ s, key: KEYS.left, cls: "target_left" })),
    ...leftAttrs.map(s => ({ s, key: KEYS.left, cls: "attr_left" })),
    ...rightTargets.map(s => ({ s, key: KEYS.right, cls: "target_right" })),
    ...rightAttrs.map(s => ({ s, key: KEYS.right, cls: "attr_right" }))
  ];

  const trials = [];
  for (let i = 0; i < nTrials; i++) {
    const item = jsPsych.randomization.sampleWithoutReplacement(pool, 1)[0];
    trials.push(
      withErrorFeedback(
        makeTrial({
          stimulus: item.s,
          correct_response: item.key,
          left_label: leftLabel,
          right_label: rightLabel,
          block: blockName,
          stim_class: item.cls
        })
      )
    );
  }
  return { timeline: trials };
}

// ---------- Labels ----------
const L = KEYS.left.toUpperCase();
const R = KEYS.right.toUpperCase();

function lbl(text) {
  return `<b>${text}</b>`;
}

// ---------- Timeline ----------
const timeline = [];

timeline.push(instructions(
  `<p><b>분류 과제 안내</b></p>
   <p>화면 위의 분류 규칙에 따라 가운데 제시되는 단어를 <b>빠르고 정확하게</b> 분류해 주세요.</p>
   <p><b>${L}</b> = 왼쪽, <b>${R}</b> = 오른쪽 키입니다.</p>
   <p>틀리면 <b>X</b>가 잠깐 나타납니다.</p>
   <p>스페이스바를 누르면 시작합니다.</p>`,
  "intro"
));

// Block 1: Gender practice
timeline.push(instructions(
  `<p><b>연습 1</b></p>
   <p>${lbl(L + ": 남성")} / ${lbl(R + ": 여성")}</p>`,
  "B1_inst"
));
timeline.push(buildSimpleBlock({
  leftStim: STIM_MALE,
  rightStim: STIM_FEMALE,
  leftLabel: lbl(L + ": 남성"),
  rightLabel: lbl(R + ": 여성"),
  blockName: "B1_gender_practice",
  nTrials: N_B1,
  leftClass: "male",
  rightClass: "female"
}));

// Block 2: Attribute practice
timeline.push(instructions(
  `<p><b>연습 2</b></p>
   <p>${lbl(L + ": 재능")} / ${lbl(R + ": 노력")}</p>`,
  "B2_inst"
));
timeline.push(buildSimpleBlock({
  leftStim: STIM_TALENT,
  rightStim: STIM_EFFORT,
  leftLabel: lbl(L + ": 재능"),
  rightLabel: lbl(R + ": 노력"),
  blockName: "B2_attribute_practice",
  nTrials: N_B2,
  leftClass: "talent",
  rightClass: "effort"
}));

// Block 3 & 4: Combined (남성+재능 / 여성+노력)
timeline.push(instructions(
  `<p><b>결합 과제</b></p>
   <p>${lbl(L + ": 남성 + 재능")} / ${lbl(R + ": 여성 + 노력")}</p>`,
  "B3_inst"
));
timeline.push(buildCombinedBlock({
  leftTargets: STIM_MALE,
  rightTargets: STIM_FEMALE,
  leftAttrs: STIM_TALENT,
  rightAttrs: STIM_EFFORT,
  leftLabel: lbl(L + ": 남성 + 재능"),
  rightLabel: lbl(R + ": 여성 + 노력"),
  blockName: "B3_combined_practice",
  nTrials: N_B3
}));
timeline.push(buildCombinedBlock({
  leftTargets: STIM_MALE,
  rightTargets: STIM_FEMALE,
  leftAttrs: STIM_TALENT,
  rightAttrs: STIM_EFFORT,
  leftLabel: lbl(L + ": 남성 + 재능"),
  rightLabel: lbl(R + ": 여성 + 노력"),
  blockName: "B4_combined_test",
  nTrials: N_B4
}));

// Block 5: Gender switch
timeline.push(instructions(
  `<p><b>전환 연습</b></p>
   <p>${lbl(L + ": 여성")} / ${lbl(R + ": 남성")}</p>`,
  "B5_inst"
));
timeline.push(buildSimpleBlock({
  leftStim: STIM_FEMALE,
  rightStim: STIM_MALE,
  leftLabel: lbl(L + ": 여성"),
  rightLabel: lbl(R + ": 남성"),
  blockName: "B5_gender_switch",
  nTrials: N_B5,
  leftClass: "female",
  rightClass: "male"
}));

// Block 6 & 7: Combined reversed (여성+재능 / 남성+노력)
timeline.push(instructions(
  `<p><b>결합 과제</b></p>
   <p>${lbl(L + ": 여성 + 재능")} / ${lbl(R + ": 남성 + 노력")}</p>`,
  "B6_inst"
));
timeline.push(buildCombinedBlock({
  leftTargets: STIM_FEMALE,
  rightTargets: STIM_MALE,
  leftAttrs: STIM_TALENT,
  rightAttrs: STIM_EFFORT,
  leftLabel: lbl(L + ": 여성 + 재능"),
  rightLabel: lbl(R + ": 남성 + 노력"),
  blockName: "B6_combined_practice",
  nTrials: N_B6
}));
timeline.push(buildCombinedBlock({
  leftTargets: STIM_FEMALE,
  rightTargets: STIM_MALE,
  leftAttrs: STIM_TALENT,
  rightAttrs: STIM_EFFORT,
  leftLabel: lbl(L + ": 여성 + 재능"),
  rightLabel: lbl(R + ": 남성 + 노력"),
  blockName: "B7_combined_test",
  nTrials: N_B7
}));

timeline.push(instructions(
  `<p>과제가 종료되었습니다.</p>
   <p>스페이스바를 누르면 종료합니다.</p>`,
  "end"
));

// ---------- Run ----------
jsPsych.run(timeline);
