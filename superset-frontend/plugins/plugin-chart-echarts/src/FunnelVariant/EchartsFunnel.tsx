/**
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
import React, { useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ChartsState, RootState } from 'src/dashboard/types';
import Button from 'src/components/Button';
import { FunnelChartTransformedProps } from './types';
import { allEventHandlers } from '../utils/eventHandlers';
import { rgb } from 'd3-color';

// import { formatFunnelLabel } from './transformProps';
// import Echart from '../components/Echart';
// import {
//   NumberFormatter,
// } from '@superset-ui/core';

export default function EchartsFunnelVariant(
  props: FunnelChartTransformedProps,
) {
  const {
    // height,
    // width,
    echartOptions,
    setDataMask,
    labelMap,
    groupby,
    selectedValues,
    formData,
  } = props;
  const formatter = (data: any) => echartOptions?.tooltip?.formatter(data);
  const parentChart = useSelector<RootState, ChartsState>(
    state => state.charts[formData.sliceId],
  );
  const [totalExperimentData, setTotalExperimentData] = useState(null);
  const metricsDataList = echartOptions?.series[0].data;
  const [statMap, setStatMap] = useState([
    {
      width: '100%',
      percent: 100,
      ...metricsDataList[0],
      display: true,
      label: formatter({
        ...metricsDataList[0],
        percent: 100,
      }),
    },
  ]);

  const innerContainer = {
    padding: '5px',
    borderRadius: '2px',
    marginBottom: '3px',
    // position: 'relative',
    height: '35px',
  };
  const labelStyle = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    fontSize: '12px',
    fontWeight: 'bold',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: rgb(0, 0, 0),
    zIndex: 1,
  };

  const overflowContainer = {
    overflow: 'auto',
    height: '269px',
    minHeight: '275px',
  };

  const flexCenter = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const legendContainer = {
    display: 'flex',
    overflow: 'auto',
    paddingBottom: '10px',
    marginBottom: '3px',
  };

  const buttonStyle = {
    fontWeight: 'bold',
    border: '0',
    margin: '2px',
    // eslint-disable-next-line theme-colors/no-literal-colors
    color: 'rgb(0,0,0)',
    fontSize: '12px',
    padding: '5px',
    borderRadius: '4px',
  };

  const handleChange = useCallback(
    (values: string[]) => {
      if (!formData.emitFilter) {
        return;
      }

      const groupbyValues = values.map(value => labelMap[value]);

      setDataMask({
        extraFormData: {
          filters:
            values.length === 0
              ? []
              : groupby.map((col, idx) => {
                const val = groupbyValues.map(v => v[idx]);
                if (val === null || val === undefined)
                  return {
                    col,
                    op: 'IS NULL',
                  };
                return {
                  col,
                  op: 'IN',
                  val: val as (string | number | boolean)[],
                };
              }),
        },
        filterState: {
          value: groupbyValues.length ? groupbyValues : null,
          selectedValues: values.length ? values : null,
        },
      });
    },
    [groupby, labelMap, setDataMask, selectedValues],
  );

  const eventHandlers = allEventHandlers(props, handleChange);
  useEffect(() => {
    try {
      if (parentChart?.queriesResponse?.length && !totalExperimentData) {
        const colName =
        parentChart?.queriesResponse?.[0]?.colnames[
          parentChart?.queriesResponse?.[0]?.colnames?.length - 1
        ];
        const data = parentChart?.queriesResponse?.[0]?.data[0]?.[colName];
        setTotalExperimentData(data);
      }
    } catch (err) {
      console.log('🚀 ~ file: EchartsFunnel.tsx:155 ~ useEffect ~ err', err);
    }
    return () => undefined;
  }, [parentChart?.queriesResponse]);

  useEffect(() => {
    const newStatList: any = [];
    if (metricsDataList.length) {
      statMap.forEach((data: any, index: number) => {
        newStatList.push({
          ...data,
          itemStyle: metricsDataList[index].itemStyle,
        });
      });
    }
    setStatMap(newStatList);
  }, [formData.colorScheme]);

  useEffect(() => {
    const len: number = metricsDataList.length;
    const containerWidth = Math.abs(100 / len);
    const newStatList: any = [];

    metricsDataList.reduce((a: any, b: any, index: number) => {
      const width = containerWidth * (len - index);
      const changePercentage = ((b.value / a?.value) * 100).toFixed(2);

      const newElement: any = {
        ...b,
        percent: changePercentage,
        width: `${width}%`,
        display: true,
        label: formatter({
          ...b,
          percent: changePercentage,
        }),
      };

      newStatList.push(newElement);
      return b;
    });
    setStatMap([...statMap, ...newStatList]);
  }, []);

  const recalculate = (metricList: any) => {
    try {
      const filteredMetric = metricList.filter((metric: any) => metric.display);
      const metricListLength = metricList.length;
      const containerWidth = Math.abs(100 / filteredMetric.length);
      let counter = 0;
      const newList = [];
      for (let i = 0; i < metricListLength; i++) {
        if (metricList[i].display) {
          metricList[i] = {
            ...metricList[i],
            width: `${containerWidth * (filteredMetric.length - counter)}%`,
          };
          counter++;
          if (newList.length) {
            const changePercentage = (
              (metricList[i].value / newList[newList.length - 1].value) *
              100
            ).toFixed(2);
            metricList[i] = {
              ...metricList[i],
              percent: changePercentage,
              label: formatter({
                ...metricList[i],
                percent: changePercentage,
              }),
            };
          } else {
            metricList[i] = {
              ...metricList[i],
              percent: 100,
              label: formatter({
                ...metricList[i],
                percent: 100,
              }),
            };
          }
          newList.push(metricList[i]);
        }
      }
      return metricList;
    } catch (err) {
      console.log("🚀 ~ file: EchartsFunnel.tsx:179 ~ recalculate ~ err", err)
    }
    return false;
  };

  const handleLegendClick = (item: number) => {
    const newStatMap: any = [...statMap];
    newStatMap[item] = {
      ...newStatMap[item],
      display: !newStatMap[item].display,
    };
    const result = recalculate(newStatMap);
    setStatMap(result);
  };

  return (
    <div className="main-funnel-variant">
      {totalExperimentData && statMap?.length && formData?.variantSliceId && (
        <div>
          Total Value: {totalExperimentData}
          ({((statMap[0].value / totalExperimentData) * 100).toFixed(2)}%)
        </div>
      )}
      <div className="legend-container" style={legendContainer}>
        {(statMap || [])?.map(({ name, itemStyle, display }, index) => (
          <div
            style={{
              display: 'inline-block',
              opacity: !display ? 0.4 : itemStyle.opacity,
            }}
          >
            <Button
              buttonStyle="primary"
              className="btn-danger"
              style={{
                background: itemStyle.color,
                ...buttonStyle,
              }}
              onClick={() => handleLegendClick(index)}
            >
              {name}
            </Button>
          </div>
        ))}
      </div>
      <div
        style={{
          // flexDirection: 'column',
          // ...flexCenter,
          ...overflowContainer,
          height: `${statMap.length * 41 - 140}px`,
        }}
      >
        {statMap.map(({ display, itemStyle, width, label, name }) => (
          <div
            style={{
              width: '100%',
              position: 'relative',
              ...flexCenter,
              display: display ? 'flex' : 'none',
            }}
          >
            <div
              style={{ width, background: itemStyle.color, ...innerContainer }}
            >
              <div style={{ ...labelStyle, ...flexCenter }}>
                <div>{label}</div>
                <div>
                  {formData?.metricData?.[name]
                    ? formData.metricData[name]
                    : ''}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
