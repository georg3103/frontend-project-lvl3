import 'bootstrap/dist/css/bootstrap.min.css';
import './css/main.scss';
import axios from 'axios';
import parse from './parser';

const testURL = 'https://ru.hexlet.io/lessons.rss';

const getStream = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  axios({
    method: 'get',
    url: `${proxy}/${url}`,
  }).then((res) => {
    const { data } = res;
    const parsedData = parse(data);
    console.log(parsedData);
  });
};

export default () => {
  getStream(testURL);
};
