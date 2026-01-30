// jsPsych 최소 동작 테스트
const jsPsych = initJsPsych({
  on_finish: function () {
    jsPsych.data.displayData("json");
  }
});

const timeline = [];

timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div style="max-width:720px;margin:40px auto;font-size:20px;line-height:1.6;">
      <p><b>jsPsych 테스트 화면</b></p>
      <p>아무 키나 누르면 반응시간(RT)이 기록됩니다.</p>
      <p style="font-size:14px;color:#666;">이 화면이 보이면 jsPsych 로딩 성공입니다.</p>
    </div>
  `
});

jsPsych.run(timeline);
