import { Component, inject, signal, viewChild } from '@angular/core';
import { form, FormField, FormRoot, pattern, required, schema } from '@angular/forms/signals';
import { FieldDecorator, FieldHint, FieldLabel, FieldSuffix, InputField } from '@cynthion/ngx-formidable';
import { ApiService } from '../api/api.service';
import { messageOf } from '../api/studio.helpers';
import { StudioService } from '../api/studio.service';
import { DialogComponent } from '../ui/dialog/dialog.component';
import { ToastService } from '../ui/toast/toast.service';
import { PasswordFieldComponent } from './password-field/password-field.component';

interface SettingsModel {
  baseUrl: string;
  apiKey: string;
  imageModel: string;
  describeModel: string;
  pricePlain: string;
  priceReferenced: string;
}

const PRICE = /^(\d+(\.\d*)?|\.\d+)?$/;

const price = (text: string): number | undefined => (text.trim() ? Number(text) : undefined);

/** The endpoint, its key, the two models and the prices, stored per user outside the project. */
@Component({
  selector: 'studio-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss',
  imports: [
    DialogComponent,
    FieldDecorator,
    FieldHint,
    FieldLabel,
    FieldSuffix,
    FormField,
    FormRoot,
    InputField,
    PasswordFieldComponent
  ]
})
export class SettingsDialogComponent {
  protected readonly studio = inject(StudioService);
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);

  private readonly dialog = viewChild.required(DialogComponent);
  private readonly settings = this.studio.state()!.settings;

  protected readonly hasKey = this.settings.hasApiKey;
  protected readonly revealed = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly model = signal<SettingsModel>({
    baseUrl: this.settings.baseUrl,
    apiKey: '',
    imageModel: this.settings.imageModel,
    describeModel: this.settings.describeModel,
    pricePlain: this.settings.pricePlain?.toString() ?? '',
    priceReferenced: this.settings.priceReferenced?.toString() ?? ''
  });
  protected readonly form = form(
    this.model,
    schema<SettingsModel>((path) => {
      required(path.baseUrl, { message: 'Enter the base URL' });
      pattern(path.baseUrl, /^https?:\/\/\S+$/, { message: 'Starts with http:// or https://' });
      required(path.apiKey, { message: 'Enter the API key', when: () => !this.hasKey });
      required(path.imageModel, { message: 'Enter the image model' });
      required(path.describeModel, { message: 'Enter the describe model' });
      pattern(path.pricePlain, PRICE, { message: 'A price such as 0.04' });
      pattern(path.priceReferenced, PRICE, { message: 'A price such as 0.06' });
    }),
    { submission: { action: () => this.save() } }
  );

  private async save(): Promise<undefined> {
    const m = this.model();
    this.error.set(undefined);
    try {
      await this.api.send('PUT', '/api/settings', {
        baseUrl: m.baseUrl.trim(),
        apiKey: m.apiKey,
        imageModel: m.imageModel.trim(),
        describeModel: m.describeModel.trim(),
        pricePlain: price(m.pricePlain),
        priceReferenced: price(m.priceReferenced)
      });
    } catch (e) {
      this.error.set(messageOf(e));
      return;
    }
    this.toasts.info('Saved the settings');
    await this.studio.reload();
    this.dialog().close('saved');
  }
}
