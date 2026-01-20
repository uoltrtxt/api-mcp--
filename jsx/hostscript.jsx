if (app.project) {
  // Premiere Pro: app.project.activeSequence is defined when a sequence is active
  if (app.project.activeSequence) {
    var seq = app.project.activeSequence;
    var currentTime = seq.getPlayerPosition();
    var seconds = currentTime.seconds;
    var markers = seq.markers;
    var newMarker = markers.createMarker(seconds);
    newMarker.name = "Chat Marker";
    newMarker.comments = "Added via CEP panel";
    return "Premiere: " + seconds.toFixed(2) + "초 위치에 마커를 추가했습니다.";
  }
  // After Effects: activeItem is a CompItem when a composition is active
  if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
    var comp = app.project.activeItem;
    var marker = new MarkerValue("Chat Marker");
    // Set marker at current composition time
    comp.markerProperty.setValueAtTime(comp.time, marker);
    return "AE: " + comp.time.toFixed(2) + "초 위치에 컴포지션 마커를 추가했습니다.";
  }
}
return "활성 시퀀스(프리미어) 또는 컴포지션(AE)이 없습니다.";
catch (err) {
return "ExtendScript 오류: " + err.toString();
}
function getHostProjectSummary() {
  try {
    var summary = [];
    var hostName = app && app.name ? app.name : "Unknown";
    summary.push("호스트: " + hostName);
    if (app && app.project) {
      summary.push("프로젝트 이름: " + app.project.name);
      if (app.project.activeSequence) {
        var seq = app.project.activeSequence;
        summary.push("활성 시퀀스: " + seq.name);
        summary.push("재생 위치(초): " + seq.getPlayerPosition().seconds.toFixed(2));
        summary.push("마커 개수: " + seq.markers.numMarkers);
        return summary.join("\n");
      }
      if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
        var comp = app.project.activeItem;
        summary.push("활성 컴포지션: " + comp.name);
        summary.push("현재 시간(초): " + comp.time.toFixed(2));
        summary.push("해상도: " + comp.width + "x" + comp.height);
        summary.push("레이어 개수: " + comp.numLayers);
        return summary.join("\n");
      }
    }
    if (app && app.documents && app.documents.length !== undefined) {
      summary.push("열린 문서 수: " + app.documents.length);
      if (app.activeDocument) {
        summary.push("활성 문서: " + app.activeDocument.name);
      }
      return summary.join("\n");
    }
    if (app && app.activeDocument) {
      summary.push("활성 문서: " + app.activeDocument.name);
      return summary.join("\n");
    }
    summary.push("전용 프로젝트 정보가 없습니다.");
    return summary.join("\n");
  } catch (err) {
    return "ExtendScript 오류: " + err.toString();
  }
}

function runDynamicExtendScript(code) {
  try {
    if (!code) {
      return "실행할 코드가 없습니다.";
    }
    var result = eval(code);
    return result === undefined ? "코드 실행 완료." : "코드 실행 결과: " + result;
  } catch (err) {
    return "코드 실행 오류: " + err.toString();
  }
}