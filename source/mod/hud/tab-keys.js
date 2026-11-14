(function(root){
 'use strict';
 function index(e){
  if(e.altKey||e.metaKey||e.isComposing||e.repeat||e.defaultPrevented)return -1;
  const target=e.target;
  if(target&&(target.isContentEditable||target.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"],[role="slider"]')))return -1;
  // Keep the platform's browser shortcuts with other modifier combinations.
  const shifted='!@#$%^&*('.indexOf(e.key);
  if(/^[1-9]$/.test(e.key))return Number(e.key)-1;
  return shifted;
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={index};else root.HudTabKeys={index};
})(typeof window!=='undefined'?window:this);
