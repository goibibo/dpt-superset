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
import React from 'react';
import Collapse from 'src/components/Collapse';
import { Link } from 'react-router-dom';

class ExperimentSummary extends React.PureComponent {
  render() {
    const backgroundColor = 'aliceblue';
    const {
      name,
      description,
      url,
      controlVariant,
      treatmentVariant,
      experimentSummary,
    } = this.props.meta;
    return (
      <div
        className="experiment-summary-container"
        style={{
          background: backgroundColor,
          padding: 10,
          border: '2px solid gainsboro',
          borderRadius: 4,
        }}
      >
        <div className="d-flex">
          <h4>
            {name}{' '}
            <Link to={{ pathname: url }} target="_blank">
              See Experiment
            </Link>
          </h4>
        </div>
        <p>{description}</p>
        <Collapse
          defaultActiveKey="experiment_variant"
          expandIconPosition="right"
          key="native-filter-config-3xj"
        >
          <Collapse.Panel key="experiment_variant" header="Experiment Variants">
            {(controlVariant?.length || treatmentVariant?.length) && (
              <table className="table table-striped table-condensed">
                <tr>
                  <th> TYPE </th>
                  <th> Variant ID </th>
                  <th> Experiment ID </th>
                  <th> Description </th>
                  <th> Values </th>
                  <th> Percentage </th>
                </tr>
                {controlVariant.map((data, index) => (
                  <tr key={`controlv-${index}`}>
                    <td>Control Variant</td>
                    <td>{data.id}</td>
                    <td>{data.experimentUid}</td>
                    <td>{data.description}</td>
                    <td>
                      {data.values.map(value => (
                        <span>{value},</span>
                      ))}
                    </td>
                    <td>{data.percentage}</td>
                  </tr>
                ))}
                {treatmentVariant.map((data, index) => (
                  <tr key={`treatmentv-${index}`}>
                    <td>Treatment Variant</td>
                    <td>{data.id}</td>
                    <td>{data.experimentUid}</td>
                    <td>{data.description}</td>
                    <td>
                      {data.values.map(value => (
                        <span>{value},</span>
                      ))}
                    </td>
                    <td>{data.percentage}</td>
                  </tr>
                ))}
              </table>
            )}
          </Collapse.Panel>
        </Collapse>

        <Collapse
          defaultActiveKey="experiment_summary"
          expandIconPosition="right"
          key="native-filter-config-4xj"
        >
          <Collapse.Panel key="experiment_summary" header="Experiment Summary">
            {experimentSummary?.length && (
              <table className="table table-striped table-condensed">
                <tr>
                  <th> Variant </th>
                  <th> Total</th>
                  <th> Positive </th>
                  <th> Positive Rate </th>
                  <th> Posterior Mean </th>
                  <th> Prob Being Best </th>
                  <th> Expected Loss </th>
                </tr>
                {experimentSummary.map(data => (
                  <tr>
                    <td>{data.variant}</td>
                    <td>{data.totals}</td>
                    <td>{data.positives}</td>
                    <td>{data.positive_rate}</td>
                    <td>{data.posterior_mean}</td>
                    <td>{data.prob_being_best}</td>
                    <td>{data.expected_loss}</td>
                  </tr>
                ))}
              </table>
            )}
          </Collapse.Panel>
        </Collapse>
      </div>
    );
  }
}

// ExperimentSummary.propTypes = propTypes;
// ExperimentSummary.defaultProps = defaultProps;

export default ExperimentSummary;
