declare module "xmldoc" {
    class XmlElement {
        public constructor(tag: string);
        readonly name: string;
        readonly attr: any;
        readonly val: string;
        readonly children: XmlElement[];
        readonly firstChild: XmlElement;
        readonly lastChild: XmlElement;
        readonly line: number;
        readonly column: number;
        readonly position: number;
        readonly startTagPosition: number;
        eachChild(func: (child: XmlElement, index?: number, array?: XmlElement[]) => void): void;
        childNamed(name: string): XmlElement;
        childrenNamed(name: string): XmlElement[];
        childWithAttribute(name: string, value?: any): XmlElement;
        descendantWithPath(path: string): XmlElement;
        valueWithPath(path: string): string;
        toString(options?: XmlToStringOptions): string;
    }

    export class XmlDocument extends XmlElement {
        public constructor(xml: string);
        readonly doctype: string;
    }

    interface XmlToStringOptions {
        readonly compressed?: boolean;
        readonly trimmed?: boolean;
        readonly preserveWhitespace?: boolean;
    }
}