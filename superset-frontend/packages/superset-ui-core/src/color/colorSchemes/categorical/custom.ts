/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import CategoricalScheme from '../../CategoricalScheme';

const schemes = [
  {
    id: 'customBlue',
    label: 'Blue Fade',
    colors: [
      '#2d75fa',
      '#4182fb',
      '#558ffb',
      '#699cfc',
      '#7da9fc',
      '#91b7fd',
      '#a5c4fd',
      '#b9d1fd',
      '#b9d1fd',
      '#e1ebfe',
      '#f5f8ff',
    ],
  },
  {
    id: 'customGreen',
    label: 'Green Fade',
    colors: [
      '#69d48c',
      '#78d898',
      '#88dda4',
      '#98e1b1',
      '#a8e6bd',
      '#b8eac9',
      '#c8efd5',
      '#d7f4e1',
      '#e7f8ed',
      '#f7fdf9',
    ],
  },
  {
    id: 'customYellow',
    label: 'Yellow Fade',
    colors: [
      '#C0CA33',
      '#CDDC39',
      '#D4E157',
      '#DCE775',
      '#E6EE9C',
      '#F0F4C3',
      '#F9FBE7',
    ],
  },
  {
    id: 'customMix',
    label: 'Mix Fade',
    colors: [
      '#FFCDD2',
      '#F8BBD0',
      '#E1BEE7',
      '#D1C4E9',
      '#C5CAE9',
      '#BBDEFB',
      '#B3E5FC',
      '#B2EBF2',
      '#B2DFDB',
      '#C8E6C9',
      '#DCEDC8',
      '#F0F4C3',
      '#FFF9C4',
      '#FFECB3',
      '#FFE0B2',
    ],
  },
].map(s => new CategoricalScheme(s));

export default schemes;
