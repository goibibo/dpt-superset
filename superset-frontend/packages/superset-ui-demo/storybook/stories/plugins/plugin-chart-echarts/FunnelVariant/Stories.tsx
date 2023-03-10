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

import React from 'react';
import { SuperChart, getChartTransformPropsRegistry } from '@superset-ui/core';
import { boolean, number, select, withKnobs } from '@storybook/addon-knobs';
import {
  EchartsFunnelVariantChartPlugin,
  FunnelVariantTransformProps,
} from '@superset-ui/plugin-chart-echarts';
import { dataSource } from './constants';
import { withResizableChartDemo } from '../../../../shared/components/ResizableChartDemo';

new EchartsFunnelVariantChartPlugin()
  .configure({ key: 'echarts-funnel-variant' })
  .register();

getChartTransformPropsRegistry().registerValue(
  'echarts-funnel-variant',
  FunnelVariantTransformProps,
);

export default {
  title: 'Chart Plugins/plugin-chart-echarts/FunnelVariant',
  decorators: [withKnobs, withResizableChartDemo],
};

export const FunnelVariant = ({ width, height }) => (
  <SuperChart
    chartType="echarts-funnel-variant"
    width={width}
    height={height}
    queriesData={[{ data: dataSource }]}
    formData={{
      colorScheme: 'supersetColors',
      groupby: ['name'],
      metric: 'value',
      numberFormat: 'SMART_NUMBER',
      orient: select('orient', ['horizontal', 'vertical'], 'vertical'),
      sort: select('sort', ['descending', 'ascending', 'none'], 'descending'),
      gap: number('gap', 0),
      labelType: select(
        'label type',
        [
          'key',
          'value',
          'percent',
          'key_value',
          'key_percent',
          'key_value_percent',
        ],
        'key',
      ),
      labelLine: boolean('Label line', true),
      showLabels: boolean('Show labels', true),
      showLegend: boolean('Show legend', false),
    }}
  />
);
