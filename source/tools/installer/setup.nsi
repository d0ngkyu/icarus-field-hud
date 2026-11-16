Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64
!include "MUI2.nsh"
!define APP "Icarus Field HUD"
!define VER "1.1.0.0"
Name "${APP}"
OutFile "IcarusHUD-Setup.exe"
InstallDir "$LOCALAPPDATA\IcarusHUD"
RequestExecutionLevel user
BrandingText "${APP} · 팬 제작 도구"
VIProductVersion "${VER}"
VIAddVersionKey /LANG=1042 "ProductName" "${APP}"
VIAddVersionKey /LANG=1042 "FileDescription" "${APP} 설치 프로그램"
VIAddVersionKey /LANG=1042 "FileVersion" "${VER}"
VIAddVersionKey /LANG=1042 "ProductVersion" "${VER}"
VIAddVersionKey /LANG=1042 "CompanyName" "Icarus Field HUD (github.com/d0ngkyu/icarus-field-hud)"
VIAddVersionKey /LANG=1042 "LegalCopyright" "팬 제작 무료 도구 · 비공식"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "${APP} 설치"
!define MUI_WELCOMEPAGE_TEXT "이카루스를 두 번째 모니터에서 도와주는 HUD를 설치합니다.$\r$\n$\r$\n• 관리자 권한 없이 내 사용자 폴더에만 설치합니다.$\r$\n• 게임 파일은 바꾸지 않고, 게임의 모드 폴더만 추가합니다.$\r$\n• 설정의 '프로그램 추가/제거'에서 언제든 지울 수 있습니다.$\r$\n$\r$\n[설치]를 누르면 끝까지 알아서 진행됩니다."
!define MUI_FINISHPAGE_TITLE "설치 완료"
!define MUI_FINISHPAGE_TEXT "이제 HUD를 실행하면 Icarus 게임 폴더를 찾아 모드를 설치합니다.$\r$\n그다음부터는 게임을 켤 때 같이 켜지고, 새 버전은 자동으로 받아요."
!define MUI_FINISHPAGE_RUN "$INSTDIR\IcarusHUD.exe"
!define MUI_FINISHPAGE_RUN_TEXT "지금 HUD 실행하기"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\사용법.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "사용법 보기"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!define MUI_WELCOMEPAGE_TITLE_3LINES
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Korean"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\IcarusHUD"

Section "install"
  ; a running HUD would lock its files
  nsExec::Exec 'taskkill /IM IcarusHUD.exe /F'
  SetOutPath "$INSTDIR"
  File /r "app\IcarusHUD\*.*"
  WriteUninstaller "$INSTDIR\제거.exe"
  CreateShortCut "$DESKTOP\Icarus HUD.lnk" "$INSTDIR\IcarusHUD.exe"
  CreateDirectory "$SMPROGRAMS\Icarus HUD"
  CreateShortCut "$SMPROGRAMS\Icarus HUD\Icarus HUD.lnk" "$INSTDIR\IcarusHUD.exe"
  CreateShortCut "$SMPROGRAMS\Icarus HUD\Icarus HUD 제거.lnk" "$INSTDIR\제거.exe"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\IcarusHUD.exe"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "Icarus Field HUD (팬 제작)"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "1.1"
  WriteRegStr HKCU "${UNKEY}" "URLInfoAbout" "https://github.com/d0ngkyu/icarus-field-hud"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\제거.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM IcarusHUD.exe /F'
  Delete "$DESKTOP\Icarus HUD.lnk"
  RMDir /r "$SMPROGRAMS\Icarus HUD"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
SectionEnd
