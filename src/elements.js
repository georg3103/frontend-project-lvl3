/* eslint-disable func-names */
/* eslint-disable no-undef */

export default (function () {
  const input = document.querySelector('#url-address');
  const form = document.querySelector('#form');
  const button = form.querySelector('button[type="submit"]');
  const container = document.querySelector('.container');
  return {
    input,
    form,
    button,
    container,
  };
}());
