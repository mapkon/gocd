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

import {ErrorResponse} from "helpers/api_request_builder";
import m from "mithril";
import Stream from "mithril/stream";
import {PackagesCRUD} from "models/package_repositories/packages_crud";
import {Package, PackageRepositories, PackageRepository, PackageUsages} from "models/package_repositories/package_repositories";
import {PackageJSON} from "models/package_repositories/package_repositories_json";
import {Configurations} from "models/shared/configuration";
import {PluginInfo, PluginInfos} from "models/shared/plugin_infos_new/plugin_info";
import {Link} from "views/components/link";
import {Modal, Size} from "views/components/modal";
import {DeleteConfirmModal} from "views/components/modal/delete_confirm_modal";
import {EntityModalWithCheckConnection} from "views/components/modal/entity_modal";
import {Table} from "views/components/table";
import {PackageModalBody} from "./package_modal_body";

abstract class PackageModal extends EntityModalWithCheckConnection<Package> {
  protected readonly originalEntityId: string;
  protected readonly originalEntityName: string;
  private readonly disableId: boolean;
  private readonly disablePackageRepo: boolean;
  private readonly packageRepositories: PackageRepositories;

  constructor(entity: Package,
              packageRepositories: PackageRepositories,
              pluginInfos: PluginInfos,
              onSuccessfulSave: (msg: m.Children) => any,
              disableId: boolean          = false,
              disablePackageRepo: boolean = true,
              size: Size                  = Size.medium) {
    super(entity, pluginInfos, onSuccessfulSave, size);
    this.disableId           = disableId;
    this.disablePackageRepo  = disablePackageRepo;
    this.originalEntityId    = entity.id();
    this.originalEntityName  = entity.name();
    this.packageRepositories = packageRepositories;
    this.needsFoundationStyles(false);
  }

  operationError(errorResponse: any, statusCode: number) {
    if (errorResponse.data) {
      this.entity(this.parseJsonToEntity(errorResponse.data));
    }
    this.errorMessage(errorResponse.message);
  }

  protected modalBody(): m.Children {
    return <PackageModalBody pluginInfos={this.pluginInfos} packageRepositories={this.packageRepositories}
                             package={this.entity()}
                             disableId={this.disableId} disablePackageRepo={this.disablePackageRepo}
                             onPackageRepoChange={this.onPackageRepoChange.bind(this)}/>;
  }

  protected parseJsonToEntity(json: object): Package {
    return Package.fromJSON(json as PackageJSON);
  }

  protected performFetch(entity: Package): Promise<any> {
    return PackagesCRUD.get(this.originalEntityId);
  }

  protected verifyConnectionOperationPromise(): Promise<any> {
    return PackagesCRUD.verifyConnection(this.entity());
  }

  protected onPluginChange(entity: Stream<Package>, pluginInfo: PluginInfo): void {
    //no need to update the entity on plugin change
  }

  private onPackageRepoChange(newPackageRepo?: PackageRepository) {
    const packageRepo = this.entity().packageRepo();
    if (!newPackageRepo) {
      return packageRepo.id();
    }

    if (newPackageRepo.repoId() !== packageRepo.id()) {
      packageRepo.id(newPackageRepo.repoId());
      this.entity(new Package(this.entity().id(), this.entity().name(), this.entity().autoUpdate(), new Configurations([]), packageRepo));
    }

    return newPackageRepo.repoId();
  }
}

export class CreatePackageModal extends PackageModal {

  constructor(entity: Package,
              packageRepositories: PackageRepositories,
              pluginInfos: PluginInfos,
              onSuccessfulSave: (msg: m.Children) => any) {
    super(entity, packageRepositories, pluginInfos, onSuccessfulSave);
    this.isStale(false);
  }

  title(): string {
    return "Create a package";
  }

  protected operationPromise(): Promise<any> {
    return PackagesCRUD.create(this.entity());
  }

  protected successMessage(): m.Children {
    return <span>The package <em>{this.entity().name()}</em> was created successfully!</span>;
  }
}

export class EditPackageModal extends PackageModal {
  constructor(entity: Package,
              packageRepositories: PackageRepositories,
              pluginInfos: PluginInfos,
              onSuccessfulSave: (msg: m.Children) => any) {
    super(entity, packageRepositories, pluginInfos, onSuccessfulSave, true);
  }

  title(): string {
    return `Edit package ${this.entity().name()}`;
  }

  operationPromise(): Promise<any> {
    return PackagesCRUD.update(this.entity(), this.etag());
  }

  successMessage(): m.Children {
    return <span>The package <em>{this.entity().name()}</em> was updated successfully!</span>;
  }
}

export class ClonePackageModal extends PackageModal {
  constructor(entity: Package,
              packageRepositories: PackageRepositories,
              pluginInfos: PluginInfos,
              onSuccessfulSave: (msg: m.Children) => any) {
    super(entity, packageRepositories, pluginInfos, onSuccessfulSave, false, false);
  }

  title(): string {
    return `Clone package ${this.originalEntityName}`;
  }

  operationPromise(): Promise<any> {
    return PackagesCRUD.create(this.entity());
  }

  successMessage(): m.Children {
    return <span>The package <em>{this.entity().name()}</em> was created successfully!</span>;
  }

  fetchCompleted() {
    this.entity().id("");
    this.entity().name("");
  }
}

export class DeletePackageModal extends DeleteConfirmModal {
  private readonly onSuccessfulSave: (msg: m.Children) => any;

  constructor(pkg: Package, onSuccessfulSave: (msg: m.Children) => any) {
    super(DeletePackageModal.deleteConfirmationMessage(pkg),
          () => this.delete(pkg), "Are you sure?");
    this.onSuccessfulSave = onSuccessfulSave;
  }

  private static deleteConfirmationMessage(pkg: Package) {
    return <span>
          Are you sure you want to delete the package <strong>{pkg.name()}</strong>?
        </span>;
  }

  private delete(obj: Package) {
    return PackagesCRUD
      .delete(obj.id())
      .then((result) => {
        result.do(
          () => {
            this.onSuccessfulSave(
              <span>The package <em>{obj.name()}</em> was deleted successfully!</span>
            );
            this.close();
          },
          (errorResponse: ErrorResponse) => {
            this.errorMessage = errorResponse.message;
            if (errorResponse.body) {
              this.errorMessage = JSON.parse(errorResponse.body).message;
            }
          }
        );
      });
  }
}

export class UsagePackageModal extends Modal {
  private readonly profileId: string;
  private usages: PackageUsages;

  constructor(profileId: string, usages: PackageUsages) {
    super();
    this.profileId = profileId;
    this.usages    = usages;
  }

  title(): string {
    return "Usages for " + this.profileId;
  }

  body(): m.Children {
    if (this.usages.length <= 0) {
      return (<i> No usages for scm '{this.profileId}' found.</i>);
    }

    const data = this.usages.map((usage) => {
      const href = `/go/admin/pipelines/${usage.pipeline}/materials`;
      return [
        <span>{usage.group}</span>,
        <span>{usage.pipeline}</span>,
        <Link href={href}>Pipeline Material Settings</Link>
      ];
    });
    return (
      <div>
        <Table headers={["Group", "Pipeline", ""]} data={data}/>
      </div>
    );
  }

}
