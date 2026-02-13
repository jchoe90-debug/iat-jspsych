// =====================================================
// Standard IAT (7-set) - Counterbalanced Order
// =====================================================

const jsPsych = initJsPsych({
  on_finish: () => {
    jsPsych.data.displayData("json");
  }
});

const KEYS = { left: "e", right: "i" };

// ---------- Stimuli ----------
const STIM_MALE = ["남자", "남성"];
const STIM_FEMALE = ["여자", "여성"];
const STIM_TALENT = ["재능", "타고난", "천부적", "선천적", "소질"];
const STIM_EFFORT = ["노력", "연습", "훈련", "학습", "연마"];

const N_S1 = 20; const N_S2 = 20; const N_S3 = 20; const N_S4 = 56;
const N_S5 = 20; const N_S6 = 20; const N_S7 = 56;

// ---------- Helpers ----------
function instructions(html, name) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div style="max-width:820px;margin:40px auto;font-size:18px;line-height:1.7;">${html}</div>`,
    choices: [" "],
    data: { task: "instructions", name }
  };
}

function makeTrial({ stimulus, correct_response, left_label, right_label, setName, stim_class }) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="display:flex;justify-content:space-between;font-size:18px;margin:10px 20px;">
        <div>${left_label}</div>
        <div>${right_label}</div>
      </div>
      <div class="iat-stimulus" style="margin-top:70px;font-size:42px;text-align:center;">${stimulus}</div>
    `,
    choices: [KEYS.left, KEYS.right],
    post_trial_gap: 150, // 깜빡임 효과를 위한 간격
    data: { task: "IAT", set: setName, stimulus, stim_class, correct_response },
    on_finish: (data) => { data.correct = data.response === correct_response; }
  };
}

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

// ---------- Block builders (개선된 무작위 균등 방식) ----------
function buildSimpleSet({ leftStim, rightStim, leftLabel, rightLabel, setName, nTrials, leftClass, rightClass }) {
  const pool = [
    ...leftStim.map(s => ({ s, key: KEYS.left, cls: leftClass })),
    ...rightStim.map(s => ({ s, key: KEYS.right, cls: rightClass }))
  ];
  // repeat를 사용하여 좌우 비율을 정확히 맞춤
  const trials_data = jsPsych.randomization.repeat(pool, Math.ceil(nTrials / pool.length)).slice(0, nTrials);
  
  return {
    timeline: trials_data.map(item => withErrorFeedback(
      makeTrial({ stimulus: item.s, correct_response: item.key, left_label: leftLabel, right_label: rightLabel, setName, stim_class: item.cls })
    ))
  };
}

function buildCombinedSet({ leftTargets, rightTargets, leftAttrs, rightAttrs, leftLabel, rightLabel, setName, nTrials, conditionTag }) {
  const pool = [
    ...leftTargets.map(s => ({ s, key: KEYS.left, cls: "target_left" })),
    ...leftAttrs.map(s => ({ s, key: KEYS.left, cls: "attr_left" })),
    ...rightTargets.map(s => ({ s, key: KEYS.right, cls: "target_right" })),
    ...rightAttrs.map(s => ({ s, key: KEYS.right, cls: "attr_right" }))
  ];
  const trials_data = jsPsych.randomization.repeat(pool, Math.ceil(nTrials / pool.length)).slice(0, nTrials);

  return {
    timeline: trials_data.map(item => {
      const t = withErrorFeedback(makeTrial({ stimulus: item.s, correct_response: item.key, left_label: leftLabel, right_label: rightLabel, setName, stim_class: item.cls }));
      t.timeline[0].data.condition = conditionTag; // 데이터 분석용 태그
      return t;
    })
  };
}

// ---------- Labels & Order ----------
const L = KEYS.left.toUpperCase();
const R = KEYS.right.toUpperCase();
function lbl(text) { return `<b>${text}</b>`; }

const ORDER = Math.random() < 0.5 ? "A_first" : "B_first";
jsPsych.data.addProperties({ condition_order: ORDER });

// ---------- Timeline Construction ----------
const timeline = [];
timeline.push(instructions(`<p><b>분류 과제 안내</b></p><p><b>${L}</b>=왼쪽, <b>${R}</b>=오른쪽 키로 빠르게 분류하세요.</p>`, "intro"));

const S2_inst = instructions(`<p><b>연습 2</b></p><p>${lbl(L + ": 재능")} / ${lbl(R + ": 노력")}</p>`, "S2_inst");
const S2 = buildSimpleSet({ leftStim: STIM_TALENT, rightStim: STIM_EFFORT, leftLabel: lbl(L + ": 재능"), rightLabel: lbl(R + ": 노력"), setName: "S2_attribute_practice", nTrials: N_S2, leftClass: "talent", rightClass: "effort" });

function append_A_first() {
  // B1(Gender) -> B2(Attr) -> B3/4(Congruent) -> B5(Switch) -> B6/7(Incongruent)
  timeline.push(instructions(`<p><b>연습 1</b></p><p>${lbl(L + ": 남성")} / ${lbl(R + ": 여성")}</p>`, "S1_inst"));
  timeline.push(buildSimpleSet({ leftStim: STIM_MALE, rightStim: STIM_FEMALE, leftLabel: lbl(L+": 남성"), rightLabel: lbl(R+": 여성"), setName: "S1_practice", nTrials: N_S1, leftClass: "male", rightClass: "female" }));
  timeline.push(S2_inst, S2);
  timeline.push(instructions(`<p><b>결합 과제</b></p><p>${lbl(L+": 남성+재능")} / ${lbl(R+": 여성+노력")}</p>`, "S3_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_MALE, rightTargets: STIM_FEMALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 남성+재능"), rightLabel: lbl(R+": 여성+노력"), setName: "S4_test", nTrials: N_S4, conditionTag: "A" }));
  // ... (이하 S5, S6, S7 생략, 로직 동일하게 추가)
}

// (append_B_first 로직도 위와 동일하게 반대 순서로 구성)
if (ORDER === "A_first") { append_A_first(); } else { /* append_B_first 호출 */ }

// =====================================================
// Post-IAT Surveys
// - Modern Sexism Scale (8 items; Swim et al., 1995 기반 번역 초안)
// - Gender Essentialism Scale (GES) 10 items (25문항 중 임의 10개 선택; 추후 수정 가능)
// - Demographics (성별/나이/학력/전공)
// =====================================================

// 5점 리커트 라벨(원하면 7점으로 바꿔도 됨)
const LIKERT_5 = ["전혀 동의하지 않음", "동의하지 않음", "보통", "동의함", "매우 동의함"];

function likertItem({ item_id, prompt, scale, reverse = false }) {
  return {
    prompt,
    labels: LIKERT_5,
    required: true,
    name: item_id, // 결과에서 이 키로 저장됨
    // 아래 data는 jsPsychSurveyLikert가 아니라 우리가 블록 data로 따로 남길 예정
  };
}

// ---------- 1) Modern Sexism Scale (8) ----------
// 번역은 “초안”이야. 의미 보존 위주로 붙였고, 나중에 문장 다듬는 전제.
const MSS_ITEMS = [
  {
    item_id: "mss01",
    prompt: "미국 사회에서는 여성에 대한 차별이 더 이상 문제가 아니다.",
    reverse: false
  },
  {
    item_id: "mss02",
    prompt: "여성들은 성차별 때문에 좋은 일자리 기회를 종종 놓친다.",
    reverse: true // (차별이 존재한다는 진술) → 현대적 성차별 점수 계산에서는 역채점으로 쓰는 경우가 많음
  },
  {
    item_id: "mss03",
    prompt: "TV에서 여성이 성차별적으로 대우받는 모습을 보는 일은 드물다.",
    reverse: false
  },
  {
    item_id: "mss04",
    prompt: "우리 사회는 대체로 남편과 아내를 동등하게 대우한다.",
    reverse: false
  },
  {
    item_id: "mss05",
    prompt: "우리 사회는 남성과 여성이 성취를 이룰 수 있는 동등한 기회를 갖는 수준에 도달했다.",
    reverse: false
  },
  {
    item_id: "mss06",
    prompt: "여성단체(여성운동 단체)가 분노하는 이유는 이해하기 쉽다.",
    reverse: true
  },
  {
    item_id: "mss07",
    prompt: "여성단체가 여성의 기회 제한을 여전히 걱정하는 이유는 이해하기 쉽다.",
    reverse: true
  },
  {
    item_id: "mss08",
    prompt: "최근 몇 년간 정부와 언론은 여성의 실제 경험에 비해 여성 문제를 과도하게 더 걱정해 왔다.",
    reverse: false
  }
];

const modernSexismBlock = {
  type: jsPsychSurveyLikert,
  preamble: `<p style="font-size:18px;line-height:1.6;"><b>[설문 1]</b> 아래 문장에 대해 얼마나 동의하는지 선택해 주세요.</p>`,
  questions: MSS_ITEMS.map(it => likertItem({ item_id: it.item_id, prompt: it.prompt, scale: "modern_sexism", reverse: it.reverse })),
  data: {
    scale: "modern_sexism",
    // reverse key 맵을 통째로 남겨두면 나중에 점수계산할 때 편함
    reverse_key: Object.fromEntries(MSS_ITEMS.map(it => [it.item_id, it.reverse]))
  }
};

// ---------- 2) Gender Essentialism Scale (GES) 10개 선택 ----------
// 너가 준 25개 중에서 "핵심 본질주의/생물결정론" + "범주 이분법" 성격이 강한 것 위주로 10개 골랐어.
// (R) 문항은 최소 2개 포함해서 응답세트 편향을 조금 줄이게 했고, 나중에 바꾸기 쉽게 item_id로 관리.
const GES_10 = [
  { item_id: "ges01", prompt: "여성과 남성의 성격 차이는 그들의 DNA에 있다.", reverse: false },
  { item_id: "ges02", prompt: "성별 간 차이는 유전적 요인에서 비롯된다.", reverse: false },
  { item_id: "ges03", prompt: "남성과 여성의 행동 및 성격 차이는 크게 유전적 성향에 의해 결정된다.", reverse: false },
  { item_id: "ges04", prompt: "사람들은 대체로 남성적이거나 여성적이며, 그 중간은 거의 없다.", reverse: false },
  { item_id: "ges05", prompt: "누군가의 성별을 알면 그 사람에 대해 많은 측면을 알 수 있다.", reverse: false },
  { item_id: "ges06", prompt: "여성과 남성은 근본적으로 다르다.", reverse: false },
  { item_id: "ges07", prompt: "남자아이와 여자아이의 차이는 태어날 때부터 정해져 있다.", reverse: false },
  { item_id: "ges08", prompt: "남성과 여성의 차이는 주로 생물학적 요인에 의해 결정된다.", reverse: false },
  // (R)로 표시된 문항 2개 포함
  { item_id: "ges09R", prompt: "누군가가 남성이라는 사실만으로는 그 사람이 어떤 사람인지 거의 알 수 없다.", reverse: true },
  { item_id: "ges10R", prompt: "부모의 양육과 사회적 환경은 남녀 뇌의 선천적 차이보다 성차 발달에 훨씬 더 큰 영향을 미친다.", reverse: true }
];

const genderEssentialismBlock = {
  type: jsPsychSurveyLikert,
  preamble: `<p style="font-size:18px;line-height:1.6;"><b>[설문 2]</b> 아래 문장에 대해 얼마나 동의하는지 선택해 주세요.</p>`,
  questions: GES_10.map(it => likertItem({ item_id: it.item_id, prompt: it.prompt, scale: "gender_essentialism", reverse: it.reverse })),
  data: {
    scale: "gender_essentialism",
    reverse_key: Object.fromEntries(GES_10.map(it => [it.item_id, it.reverse]))
  }
};

// ---------- 3) Demographics ----------
const genderQ = {
  type: jsPsychSurveyMultiChoice,
  preamble: `<p style="font-size:18px;line-height:1.6;"><b>[인구통계]</b> 아래 질문에 답해 주세요.</p>`,
  questions: [
    {
      prompt: "귀하의 성별은 무엇입니까?",
      name: "gender",
      options: ["남성", "여성"],
      required: true
    }
  ],
  data: { scale: "demographics" }
};

const ageEduMajor = {
  type: jsPsychSurveyText,
  preamble: `<p style="font-size:18px;line-height:1.6;"><b>[인구통계]</b> 아래 질문에 답해 주세요.</p>`,
  questions: [
    {
      prompt: "귀하의 나이는 몇 살입니까? (숫자만 입력)",
      name: "age",
      required: true
    },
    {
      prompt: "귀하의 최종 학력은 무엇입니까?",
      name: "education",
      required: true
    },
    {
      prompt: "귀하의 전공은 무엇입니까? (해당 시)",
      name: "major",
      required: false
    }
  ],
  data: { scale: "demographics" }
};

// 전공을 객관식으로도 받을 거면(네 IRB 문건 스타일) 아래 블록으로 대체 가능:
// const majorCategory = {
//   type: jsPsychSurveyMultiChoice,
//   questions: [{
//     prompt: "귀하의 전공은 무엇입니까?",
//     name: "major_category",
//     options: [
//       "이공계열(기계공학, 토목공학 등)",
//       "자연과학계열(물리, 수학 등)",
//       "상경계열(경제, 경영 등)",
//       "인문계열(철학, 영어 등)",
//       "사회과학계열(심리학, 사회학 등)",
//       "예체능계열(작곡, 체육 등)",
//       "그 외 기타"
//     ],
//     required: true
//   }],
//   data: { scale: "demographics" }
// };

// ---------- Add to timeline (IAT 이후) ----------
timeline.push(modernSexismBlock);
timeline.push(genderEssentialismBlock);
timeline.push(genderQ);
timeline.push(ageEduMajor);
// timeline.push(majorCategory); // 위 객관식 전공을 쓸 경우

jsPsych.run(timeline);