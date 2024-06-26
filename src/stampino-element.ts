import {evaluateTemplate} from 'stampino';
import {StampinoBaseElement} from './stampino-base-element.js';
import {css, PropertyDeclaration, unsafeCSS} from 'lit';

const typeHints = {
  String: String,
  Number: Number,
  Boolean: Boolean,
  Object: Object,
  Array: Array,
} as const;

/**
 * Declares a custom element with Stampino templating.
 */
export class StampinoElement extends HTMLElement {
  static observedAttributes = ['name', 'properties'];

  private declare _initialized: boolean;

  class?: typeof StampinoBaseElement;
  template?: HTMLTemplateElement;

  constructor() {
    super();
    Object.defineProperty(this, '_initialized', {value: false, writable: true});
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialized = true;
      const extendsName = this.getAttribute('extends');
      const elementName = this.getAttribute('name');
      const propertiesAttr = this.getAttribute('properties');
      const propertyChildren = this.querySelectorAll('st-prop');
      this.template =
        this.querySelector<HTMLTemplateElement>('template') ?? undefined;
      const style = this.querySelector<HTMLStyleElement>(
        "style[type='adopted-css']",
      );

      let superclass = StampinoBaseElement;
      let superTemplate = undefined;

      if (extendsName !== null) {
        const superDefinition = (
          this.getRootNode() as unknown as ParentNode
        ).querySelector(`stampino-element[name=${extendsName}]`);
        if (superDefinition === null) {
          console.warn(
            `Could not find superclass definition for ${extendsName}`,
          );
          return;
        }
        const foundSuperclass = (superDefinition as StampinoElement).class;
        if (foundSuperclass) {
          superclass = foundSuperclass;
        }
        superTemplate = (superDefinition as StampinoElement).template;
      }

      const C = (this.class = class extends superclass {});
      if (this.template) {
        C.template = this.template;
      }
      if (superTemplate) {
        C.superTemplate = superTemplate;
      }

      if (style) {
        C.styles = css`
          ${unsafeCSS(style.textContent)}
        `;
      }

      for (const p of propertiesAttr?.split(' ') ?? []) {
        C.createProperty(p);
      }

      for (const p of propertyChildren) {
        const name = p.getAttribute('name');
        const reflect = p.hasAttribute('reflect');
        const noAttribute = p.hasAttribute('noattribute');
        const attribute =
          !noAttribute && (p.getAttribute('attribute') ?? undefined);
        const typeHint = p.getAttribute('type');
        const type =
          typeHint === null
            ? undefined
            : typeHints[typeHint as keyof typeof typeHints];
        const options: PropertyDeclaration = {
          reflect,
          attribute,
          type,
        };
        if (name !== null) {
          C.createProperty(name, options);
        }
      }

      // Find all callable templates in the same scope
      const root = this.getRootNode() as Document | ShadowRoot | Element;
      const templates = root.querySelectorAll('template[id]');
      C.renderers = Object.fromEntries(
        [...templates].map((t) => [
          t.id,
          (model, handlers, renderers) =>
            evaluateTemplate(
              t as HTMLTemplateElement,
              model,
              handlers,
              renderers,
            ),
        ]),
      );



      if (elementName) {
        customElements.define(elementName, C);
      }
    }
  }
}
customElements.define('stampino-element', StampinoElement);

class StampinoProperty extends HTMLElement {
  static observedAttributes = [
    'name',
    'type',
    'noattribute',
    'attribute',
    'reflect',
  ];
}
customElements.define('st-prop', StampinoProperty);
