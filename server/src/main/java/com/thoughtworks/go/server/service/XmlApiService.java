/*
 * Copyright 2022 ThoughtWorks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.thoughtworks.go.server.service;

import com.thoughtworks.go.domain.XmlRepresentable;
import com.thoughtworks.go.domain.XmlWriterContext;
import com.thoughtworks.go.util.SystemEnvironment;
import org.dom4j.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class XmlApiService {

    private final ArtifactsService artifactsService;
    private final JobInstanceService jobInstanceService;
    private final StageService stageService;
    private final SystemEnvironment systemEnvironment;

    @Autowired
    public XmlApiService(ArtifactsService artifactsService,
                         JobInstanceService jobInstanceService,
                         StageService stageService,
                         SystemEnvironment systemEnvironment) {
        this.artifactsService = artifactsService;
        this.jobInstanceService = jobInstanceService;
        this.stageService = stageService;
        this.systemEnvironment = systemEnvironment;
    }

    private XmlWriterContext ctxFor(String baseUrl) {
        return new XmlWriterContext(baseUrl, artifactsService, jobInstanceService, stageService, systemEnvironment);
    }

    public Document write(XmlRepresentable representable, String baseUrl) {
        return representable.toXml(ctxFor(baseUrl));
    }
}
