/* eslint-disable no-param-reassign */
/* eslint-disable no-shadow */
/* eslint-disable no-undef */
/* eslint-disable func-names */
import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import resources from './locales';
import parse from './parser';
import render from './render';
import validate from './validator';
import ELEMENTS from './elements';

// View

const onFormSubmit = (handler) => {
  ELEMENTS.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    handler(url);
  });
};

const onInputChange = (handler) => {
  ELEMENTS.input.addEventListener('input', (e) => {
    e.preventDefault();
    const { target: { value } } = e;
    handler(value);
  });
};

const state = {
  form: {
    state: 'filling',
    error: '',
  },
  rss: {
    urls: [],
    channels: [],
    news: [],
    error: '',
  },
};

const addRSSData = (url, state, data) => {
  const { rss } = state;
  const { title, description, items } = data;
  const uuid = _.uniqueId();
  rss.urls = [...rss.urls, { url, uuid }];
  rss.channels = [...rss.channels, {
    title,
    description,
    uuid,
    id: _.uniqueId('channel_'),
  }];
  rss.news = [...rss.news, { items, uuid, id: _.uniqueId('news_') }];
};

const getStream = (state, url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  return axios({
    method: 'get',
    url: `${proxy}/${url}`,
  }).then((res) => {
    const { data } = res;
    const parsedData = parse(data);
    addRSSData(url, state, parsedData);
  }).catch((error) => {
    state.rss.error = 'network';
    // should check, which error
    state.form.state = 'error';
    throw new Error(error);
  });
};

const validateHandler = (state) => (url) => {
  const { rss: { urls }, form } = state;
  const list = urls.map(({ url }) => url);
  try {
    validate(list, url);
    form.error = '';
    form.state = 'ready';
  } catch ({ type }) {
    form.error = type;
    form.state = 'filling';
  }
};

const formSubmitHandler = (state) => (url) => {
  getStream(state, url)
    .then(() => {
      state.form.state = 'finished';
    });
};

export default () => {
  onInputChange(validateHandler(state));
  onFormSubmit(formSubmitHandler(state));
  i18next.init({
    lng: 'en',
    debug: false,
    resources,
  }).then((texts) => {
    render(state, texts);
  });
};
