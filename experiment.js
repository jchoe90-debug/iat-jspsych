// =====================================================
// Standard IAT (7-set) - Counterbalanced Order
// =====================================================

// ---------- jsPsych init ----------
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwuCzFEG_PBGmBBk2FNDP0IxWA8H8bzk4Xg0-k5AVuVHuSWe7PuKi7h6mUyG3fnnAHA/exec";

const jsPsych = initJsPsych({
  on_finish: () => {
    const allData = jsPsych.data.get().values();
    fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allData)
    })
      .then(res => res.text())
      .then(text => {
        console.log("데이터 전송 완료:", text);
        jsPsych.data.displayData("json");
      })
      .catch(err => {
        console.error("데이터 전송 실패:", err);
        jsPsych.data.displayData("json");
      });
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
    stimulus: `
      <div style="max-width:820px;margin:40px auto;font-size:18px;line-height:1.7;">${html}</div>
      <div style="position:fixed;bottom:40px;left:0;right:0;text-align:center;">
        <span style="font-size:20px;font-weight:bold;color:#1a237e;background:#e8eaf6;padding:12px 32px;border-radius:8px;border:2px solid #1a237e;letter-spacing:0.5px;">
          ▼ &nbsp; 스페이스바를 눌러 시작하세요 &nbsp; ▼
        </span>
      </div>
    `,
    choices: [" "],
    data: { task: "instructions", name }
  };
}

function makeTrial({ stimulus, correct_response, left_label, right_label, setName, stim_class }) {
  const stimHtml = (showX) => `
    <div style="display:flex;justify-content:space-between;font-size:18px;margin:10px 20px;">
      <div>${left_label}</div>
      <div>${right_label}</div>
    </div>
    <div class="iat-stimulus" style="margin-top:70px;font-size:42px;text-align:center;">${stimulus}</div>
    ${showX ? '<div style="font-size:56px;color:#b00020;text-align:center;margin-top:10px;">X</div>' : ''}
  `;

  // 1차 시도: 자극 표시, E/I 모두 수용
  const initialTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: stimHtml(false),
    choices: [KEYS.left, KEYS.right],
    // 정반응이면 150ms ITI, 오답이면 즉시 X 표시
    post_trial_gap: () => {
      const last = jsPsych.data.get().last(1).values()[0];
      return last && last.correct ? 150 : 0;
    },
    data: { task: "IAT", set: setName, stimulus, stim_class, correct_response },
    on_finish: (data) => {
      data.correct = data.response === correct_response;
      data.rt_initial = data.rt; // 초기 반응시간 보존
    }
  };

  // 오류 교정: X와 함께 자극 재표시, 정답 키만 수용
  const errorCorrectionTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: stimHtml(true),
    choices: [correct_response], // 정답 키만 허용
    post_trial_gap: 150,
    data: { task: "IAT_error_correction" },
    on_finish: (data) => {
      // 직전 IAT 시도의 rt를 총 반응시간(자극 시작 ~ 정답 입력)으로 업데이트
      const lastIAT = jsPsych.data.get().filter({ task: "IAT" }).last(1).values()[0];
      if (lastIAT) {
        lastIAT.rt = lastIAT.rt_initial + data.rt;
      }
    }
  };

  return {
    timeline: [
      initialTrial,
      {
        timeline: [errorCorrectionTrial],
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
    timeline: trials_data.map(item =>
      makeTrial({ stimulus: item.s, correct_response: item.key, left_label: leftLabel, right_label: rightLabel, setName, stim_class: item.cls })
    )
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
      const t = makeTrial({ stimulus: item.s, correct_response: item.key, left_label: leftLabel, right_label: rightLabel, setName, stim_class: item.cls });
      t.timeline[0].data.condition = conditionTag; // 데이터 분석용 태그 (initialTrial.data에 저장)
      return t;
    })
  };
}

// ---------- Labels ----------
const L = KEYS.left.toUpperCase();
const R = KEYS.right.toUpperCase();
function lbl(text) { return `<b style="font-size:20px;">${text}</b>`; }

// ---------- Condition randomization ----------
const ORDER = Math.random() < 0.5 ? "A_first" : "B_first";
jsPsych.data.addProperties({
  condition_order: ORDER
});

// ---------- Timeline Construction ----------
const timeline = [];

// ── 연구 안내 및 동의서 (1페이지 통합) ─────────────────────────────────────────
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:820px;margin:20px auto;font-size:18px;line-height:1.7;text-align:left;">
      <h2 style="text-align:center;font-size:20px;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px;">
        연구 참여자 안내문 및 동의서
      </h2>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">1. 참여 권유</h3>
      <p style="margin:0 0 10px;">본 연구는 한국 사회의 다양한 특성에 대한 인식 패턴과 평가 경향을 조사하는 것을 목표로 하는 연구입니다. 귀하는 본 연구에 참여할 것인지 여부를 결정하기 전에, 설명서와 동의서를 신중하게 읽어보셔야 합니다. 이 연구가 왜 수행되며, 무엇을 수행하는지 귀하가 이해하는 것이 중요합니다. 이 연구는 자발적으로 참여 의사를 밝히신 분에 한하여 수행될 것입니다. 다음 내용을 신중히 읽어보신 후 참여 의사를 밝혀 주시길 바랍니다.</p>
      <p style="border-left:4px solid #1a237e;padding:8px 12px;background:#f0f4ff;margin:0 0 10px;">다음 섹션으로 넘어가 설문을 진행하는 것은 귀하가 본 연구에 대해 그리고 위험성에 대해 설명을 들었음을 의미하며, 귀하께서 자신(또는 법정대리인)이 본 연구에 참가를 원한다는 것을 의미합니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">2. 연구의 목적 및 배경</h3>
      <p style="margin:0 0 10px;">본 연구의 목적은 한국 사회의 다양한 특성에 대한 인식 패턴과 평가 경향을 탐색하는 것입니다. 이를 통해 현대 한국인의 사회적 판단 과정과 인지적 연합구조를 이해하고, 이러한 이해를 바탕으로 효과적인 의사소통과 사회적 제도 등을 발전시키는 데 기여하고자 합니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">3. 예상 참여기간 및 연구대상자 수</h3>
      <ul style="margin:0 0 10px;padding-left:20px;">
        <li>해당 연구는 생명윤리위원회 승인일로부터 2026년 8월 31일까지 진행됩니다.</li>
        <li>해당 기간 내에 200명의 참여자를 모집할 계획입니다.</li>
      </ul>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">4. 연구대상자 선정기준</h3>
      <p style="margin:0 0 10px;">한국어에 능통하며 사전 동의를 제공할 수 있는, 만 19세 이상의 성인이라면 연구에 참여할 수 있습니다. 인지적 또는 신체적 제약으로 인하여 암묵적 연합 검사를 완료할 수 없는 경우에는 모집에서 제외될 수 있습니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">5. 연구 참여 절차</h3>
      <p style="margin:0 0 10px;">참여에 동의하신다면 다음 섹션으로 넘어가 설문을 진행하게 됩니다. 설문이 시작되면 지침에 따라 키보드로 신호를 입력하여 단서들을 매칭하게 될 것입니다. 소요 시간은 약 30~40분 내외로 예상됩니다. 연구 참여가 모두 완료되면 데이터는 즉시 회수되며 자료는 모두 익명으로 처리됩니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">6. 귀하가 준수해야 하는 사항</h3>
      <p style="margin:0 0 10px;">귀하는 언제든지 어떠한 불이익 없이 참여 도중에 그만둘 수 있습니다. 만일 중단을 원하시는 경우 웹페이지를 닫아주시면 됩니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">7. 예상되는 위험 및 불편사항</h3>
      <p style="margin:0 0 10px;">본 연구에는 심리적, 신체적으로 참여자들에게 직접적으로 해를 가하는 요소는 없습니다. 하지만 연구에 참여하는 도중 지침에 따라 키보드를 입력하는 행위 등에 다소의 피로감을 느낄 수 있습니다. 이로 인해 더 이상 연구에 참여하지 못하겠다고 느끼는 경우, 귀하는 언제든지 연구 참여를 중단할 수 있습니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">8. 연구 참여의 기대 이익</h3>
      <p style="margin:0 0 10px;">귀하가 이 연구에 참여하는데 있어서 직접적인 이득은 없습니다. 그러나 귀하가 제공하는 정보는 한국 사회에 대한 이해를 증진하는데 도움이 될 것입니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">9. 연구 참여에 따른 보상</h3>
      <p style="margin:0 0 10px;">이 연구에 참여해 주시는 경우 귀하께 <b>4천원 상당의 기프티콘</b>이 지급될 예정입니다. 단, 설문을 도중에 종료하시거나 개인식별정보(이름, 연락처)를 입력하지 않으신 경우 보상이 지급되지 않습니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">10. 동의 및 철회 절차</h3>
      <p style="margin:0 0 10px;">귀하는 이 연구에 참여에 동의하지 않더라도 불이익을 받지 않으며 참여해야 할 의무는 없습니다. 또한 연구참여에 동의한 경우라도 자유의사에 의하여 언제든지 이를 철회할 수 있습니다. 귀하가 이 연구에 참여를 중단하길 원하면 언제나 참여를 철회할 수 있고 그 어떠한 불이익이 없을 것입니다.</p>
      <p style="margin:0 0 10px;">만약 귀하가 연구 참여 동의를 철회하는 경우, 연구책임자 <b>최지영(010-5221-3942)</b>에게 연락하여 주십시오. 철회 시 귀하에게 수집된 모든 데이터는 즉시 파기됩니다. 단, 설문을 완료하였으나 개인식별정보를 입력하지 않으신 경우 데이터 삭제가 어려울 수 있습니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">11. 개인정보 수집 및 보호</h3>
      <p style="margin:0 0 10px;">본 연구에서 수집하는 개인식별정보는 이름과 연락처입니다. 수집된 개인식별정보는 잠금장치가 있는 USB에 보관되며 연구책임자 최지영만이 접근할 수 있습니다. 수집된 개인식별정보는 연구 참여에 대한 보상 지급 목적으로만 사용됩니다. 연구관련 자료는 「생명윤리 및 안전에 관한 법률」 시행규칙 제15조에 따라 연구종료 후 3년간 보관 후 파기됩니다. 귀하의 신상을 파악할 수 있는 기록은 연구 결과 출판 시에도 비밀로 보호됩니다.</p>

      <h3 style="color:#1a237e;font-size:17px;margin:18px 0 6px;">12. 문의처</h3>
      <table style="width:100%;border-collapse:collapse;font-size:16px;margin-bottom:8px;">
        <tr style="background:#f0f4ff;">
          <td style="padding:8px 12px;border:1px solid #ccc;"><b>연구책임자</b></td>
          <td style="padding:8px 12px;border:1px solid #ccc;">최지영</td>
          <td style="padding:8px 12px;border:1px solid #ccc;"><b>연락처</b></td>
          <td style="padding:8px 12px;border:1px solid #ccc;">010-5221-3942</td>
        </tr>
        <tr>
          <td colspan="4" style="padding:8px 12px;border:1px solid #ccc;">
            <b>이화여자대학교 생명윤리위원회(IRB)</b> &nbsp;|&nbsp; TEL: 02-3277-7154 &nbsp;|&nbsp; irb@ewha.ac.kr
          </td>
        </tr>
      </table>

      <div style="border:2px solid #1a237e;border-radius:6px;padding:14px 18px;margin-top:20px;background:#f0f4ff;text-align:center;">
        <p style="margin:0;font-weight:bold;font-size:17px;">위 내용을 모두 읽었으며, 본 연구에 자발적으로 참여하는 것에 동의합니다.</p>
      </div>
    </div>
  `,
  choices: ["동의하고 시작하기"],
  button_html: `<button class="jspsych-btn" style="font-size:18px;padding:14px 48px;background:#1a237e;color:white;border:none;border-radius:6px;cursor:pointer;margin:24px auto;display:block;">%choice%</button>`,
  data: { task: "instructions", name: "consent" }
});

// 0. Intro
timeline.push(instructions(`
  <p><b>분류 과제 안내</b></p>
  <p>키보드 <b>${L}</b>(왼쪽)과 <b>${R}</b>(오른쪽)을 사용합니다.</p>
`, "intro"));

// 공통 연습 2 (재능/노력) - 세트 번호는 각 조건 함수 안에서 push
const S2 = buildSimpleSet({ leftStim: STIM_TALENT, rightStim: STIM_EFFORT, leftLabel: lbl(L+": 재능"), rightLabel: lbl(R+": 노력"), setName: "S2_attr_prac", nTrials: N_S2, leftClass: "talent", rightClass: "effort" });

// 진행상황 표시 헬퍼
function progress(n) {
  return `<p style="font-size:15px;color:#888;margin:0 0 6px;">(${n} / 7세트)</p>`;
}

function append_A_first() {
  // 1세트: Male/Female
  timeline.push(instructions(`${progress(1)}<p><b>1세트</b></p><p>${lbl(L+": 남성")} / ${lbl(R+": 여성")}</p>`, "S1_inst"));
  timeline.push(buildSimpleSet({ leftStim: STIM_MALE, rightStim: STIM_FEMALE, leftLabel: lbl(L+": 남성"), rightLabel: lbl(R+": 여성"), setName: "S1_gen_prac", nTrials: N_S1, leftClass: "male", rightClass: "female" }));

  // 2세트: Talent/Effort
  timeline.push(instructions(`${progress(2)}<p><b>2세트</b></p><p>${lbl(L+": 재능")} / ${lbl(R+": 노력")}</p>`, "S2_inst"));
  timeline.push(S2);

  // 3세트: Male+Talent / Female+Effort (연습)
  timeline.push(instructions(`${progress(3)}<p><b>3세트</b></p><p>${lbl(L+": 남성 + 재능")} / ${lbl(R+": 여성 + 노력")}</p>`, "S3_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_MALE, rightTargets: STIM_FEMALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 남성+재능"), rightLabel: lbl(R+": 여성+노력"), setName: "S3_prac", nTrials: N_S3, conditionTag: "A" }));

  // 4세트: Male+Talent / Female+Effort (본 과제)
  timeline.push(instructions(`${progress(4)}<p><b>4세트</b></p><p>${lbl(L+": 남성 + 재능")} / ${lbl(R+": 여성 + 노력")}</p>`, "S4_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_MALE, rightTargets: STIM_FEMALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 남성+재능"), rightLabel: lbl(R+": 여성+노력"), setName: "S4_test", nTrials: N_S4, conditionTag: "A" }));

  // 5세트: Female/Male (Switch)
  timeline.push(instructions(`${progress(5)}<p><b>5세트</b></p><p>${lbl(L+": 여성")} / ${lbl(R+": 남성")}</p>`, "S5_inst"));
  timeline.push(buildSimpleSet({ leftStim: STIM_FEMALE, rightStim: STIM_MALE, leftLabel: lbl(L+": 여성"), rightLabel: lbl(R+": 남성"), setName: "S5_switch", nTrials: N_S5, leftClass: "female", rightClass: "male" }));

  // 6세트: Female+Talent / Male+Effort (연습)
  timeline.push(instructions(`${progress(6)}<p><b>6세트</b></p><p>${lbl(L+": 여성 + 재능")} / ${lbl(R+": 남성 + 노력")}</p>`, "S6_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_FEMALE, rightTargets: STIM_MALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 여성+재능"), rightLabel: lbl(R+": 남성+노력"), setName: "S6_prac", nTrials: N_S6, conditionTag: "B" }));

  // 7세트: Female+Talent / Male+Effort (본 과제)
  timeline.push(instructions(`${progress(7)}<p><b>7세트</b></p><p>${lbl(L+": 여성 + 재능")} / ${lbl(R+": 남성 + 노력")}</p>`, "S7_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_FEMALE, rightTargets: STIM_MALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 여성+재능"), rightLabel: lbl(R+": 남성+노력"), setName: "S7_test", nTrials: N_S7, conditionTag: "B" }));
}

function append_B_first() {
  // 1세트: Female/Male (B조건: 여성 먼저 시작)
  timeline.push(instructions(`${progress(1)}<p><b>1세트</b></p><p>${lbl(L+": 여성")} / ${lbl(R+": 남성")}</p>`, "S1_inst"));
  timeline.push(buildSimpleSet({ leftStim: STIM_FEMALE, rightStim: STIM_MALE, leftLabel: lbl(L+": 여성"), rightLabel: lbl(R+": 남성"), setName: "S1_gen_prac", nTrials: N_S1, leftClass: "female", rightClass: "male" }));

  // 2세트: Talent/Effort
  timeline.push(instructions(`${progress(2)}<p><b>2세트</b></p><p>${lbl(L+": 재능")} / ${lbl(R+": 노력")}</p>`, "S2_inst"));
  timeline.push(S2);

  // 3세트: Female+Talent / Male+Effort (연습, B조건 먼저)
  timeline.push(instructions(`${progress(3)}<p><b>3세트</b></p><p>${lbl(L+": 여성 + 재능")} / ${lbl(R+": 남성 + 노력")}</p>`, "S3_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_FEMALE, rightTargets: STIM_MALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 여성+재능"), rightLabel: lbl(R+": 남성+노력"), setName: "S3_prac", nTrials: N_S3, conditionTag: "B" }));

  // 4세트: Female+Talent / Male+Effort (본 과제)
  timeline.push(instructions(`${progress(4)}<p><b>4세트</b></p><p>${lbl(L+": 여성 + 재능")} / ${lbl(R+": 남성 + 노력")}</p>`, "S4_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_FEMALE, rightTargets: STIM_MALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 여성+재능"), rightLabel: lbl(R+": 남성+노력"), setName: "S4_test", nTrials: N_S4, conditionTag: "B" }));

  // 5세트: Male/Female (Switch)
  timeline.push(instructions(`${progress(5)}<p><b>5세트</b></p><p>${lbl(L+": 남성")} / ${lbl(R+": 여성")}</p>`, "S5_inst"));
  timeline.push(buildSimpleSet({ leftStim: STIM_MALE, rightStim: STIM_FEMALE, leftLabel: lbl(L+": 남성"), rightLabel: lbl(R+": 여성"), setName: "S5_switch", nTrials: N_S5, leftClass: "male", rightClass: "female" }));

  // 6세트: Male+Talent / Female+Effort (연습, A조건)
  timeline.push(instructions(`${progress(6)}<p><b>6세트</b></p><p>${lbl(L+": 남성 + 재능")} / ${lbl(R+": 여성 + 노력")}</p>`, "S6_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_MALE, rightTargets: STIM_FEMALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 남성+재능"), rightLabel: lbl(R+": 여성+노력"), setName: "S6_prac", nTrials: N_S6, conditionTag: "A" }));

  // 7세트: Male+Talent / Female+Effort (본 과제)
  timeline.push(instructions(`${progress(7)}<p><b>7세트</b></p><p>${lbl(L+": 남성 + 재능")} / ${lbl(R+": 여성 + 노력")}</p>`, "S7_inst"));
  timeline.push(buildCombinedSet({ leftTargets: STIM_MALE, rightTargets: STIM_FEMALE, leftAttrs: STIM_TALENT, rightAttrs: STIM_EFFORT, leftLabel: lbl(L+": 남성+재능"), rightLabel: lbl(R+": 여성+노력"), setName: "S7_test", nTrials: N_S7, conditionTag: "A" }));
}

// 순서 할당
if (ORDER === "A_first") { append_A_first(); } else { append_B_first(); }

// 8. 설문지 추가 (IAT 종료 후)
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

// 종료 안내
timeline.push(instructions(
  `<p>모든 과제가 완료되었습니다.</p><p>참여해 주셔서 감사합니다.</p>`, 
  "end"
));

// 실행
jsPsych.run(timeline);
