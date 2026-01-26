/*
 * hostscript.jsx
 *
 * CEP 패널(app.js)에서 호출하는 ExtendScript 함수 모음.
 * - addMarkerAtPlayhead()
 * - getHostProjectSummary()
 * - runDynamicExtendScript(code)
 */

function addMarkerAtPlayhead() {
  try {
    // Premiere Pro
    if (app && app.project && app.project.activeSequence) {
      var seq = app.project.activeSequence;
      var currentTime = seq.getPlayerPosition();
      var seconds = currentTime.seconds;
      var markers = seq.markers;
      var newMarker = markers.createMarker(seconds);
      newMarker.name = 'Chat Marker';
      newMarker.comments = 'Added via CEP panel';
      return 'Premiere: ' + seconds.toFixed(2) + '초 위치에 마커를 추가했습니다.';
    }

    // After Effects
    if (app && app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
      var comp = app.project.activeItem;
      var marker = new MarkerValue('Chat Marker');
      comp.markerProperty.setValueAtTime(comp.time, marker);
      return 'AE: ' + comp.time.toFixed(2) + '초 위치에 컴포지션 마커를 추가했습니다.';
    }

    // Photoshop 등 다른 호스트
    if (app && app.activeDocument) {
      return '현재 호스트에서는 마커 추가 기능이 지원되지 않습니다.';
    }

    return '활성 시퀀스(프리미어) 또는 컴포지션(AE)이 없습니다.';
  } catch (err) {
    return 'ExtendScript 오류: ' + err.toString();
  }
}

function getHostProjectSummary() {
  try {
    var summary = [];
    var hostName = (app && app.name) ? app.name : 'Unknown';
    summary.push('호스트: ' + hostName);

    // Premiere / After Effects
    if (app && app.project) {
      summary.push('프로젝트 이름: ' + app.project.name);

      if (app.project.activeSequence) {
        var seq = app.project.activeSequence;
        summary.push('활성 시퀀스: ' + seq.name);
        summary.push('재생 위치(초): ' + seq.getPlayerPosition().seconds.toFixed(2));
        summary.push('마커 개수: ' + seq.markers.numMarkers);
        return summary.join('\n');
      }

      if (app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
        var comp = app.project.activeItem;
        summary.push('활성 컴포지션: ' + comp.name);
        summary.push('현재 시간(초): ' + comp.time.toFixed(2));
        summary.push('해상도: ' + comp.width + 'x' + comp.height);
        summary.push('레이어 개수: ' + comp.numLayers);
        return summary.join('\n');
      }
    }

    // Photoshop / Illustrator 등
    if (app && app.documents && app.documents.length !== undefined) {
      summary.push('열린 문서 수: ' + app.documents.length);
      if (app.activeDocument) {
        summary.push('활성 문서: ' + app.activeDocument.name);
      }
      return summary.join('\n');
    }

    if (app && app.activeDocument) {
      summary.push('활성 문서: ' + app.activeDocument.name);
      return summary.join('\n');
    }

    summary.push('전용 프로젝트 정보가 없습니다.');
    return summary.join('\n');
  } catch (err) {
    return 'ExtendScript 오류: ' + err.toString();
  }
}

function runDynamicExtendScript(code) {
  try {
    if (!code) {
      return '실행할 코드가 없습니다.';
    }

    // WARNING: eval은 보안상 위험할 수 있습니다.
    // 개발/로컬 환경에서만 사용하고, 배포 시에는 허용된 명령만 실행하도록 제한하는 편이 안전합니다.
    var result = eval(code);
    return (result === undefined) ? '코드 실행 완료.' : ('코드 실행 결과: ' + result);
  } catch (err) {
    return '코드 실행 오류: ' + err.toString();
  }
}
