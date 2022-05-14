import {oneOf} from "./utils";

export class TextPartProgrammable {
    resolve(): string {
        return '';
    }

    resolveGuaranteed(): string {
        return '';
    }
}

export type TextPartResolvable = string | TextPartProgrammable;

function resolveTextPart(part: TextPartResolvable): string {
    if (typeof part == 'string') return part;
    else return part.resolve();
}

function resolveTextPartGuaranteed(part: TextPartResolvable): string {
    if (typeof part == 'string') return part;
    else return part.resolveGuaranteed();
}

export class TextPartOptions extends TextPartProgrammable {
    options: Array<TextPartResolvable>;

    constructor(...options: TextPartResolvable[]) {
        super();
        this.options = options;
    };

    resolve(): string {
        return resolveTextPart(oneOf(this.options)) + ' ';
    }

    resolveGuaranteed(): string {
        return resolveTextPartGuaranteed(oneOf(this.options)) + ' ';
    }
}

export class TextPartOptional extends TextPartProgrammable  {
    option: TextPartResolvable;

    constructor(option: TextPartResolvable) {
        super();
        this.option = option;
    };

    resolve(): string {
        if (Math.random() > 0.5) return resolveTextPart(this.option) + ' ';
        else return '';
    }

    resolveGuaranteed(): string {
        return resolveTextPartGuaranteed(this.option) + ' ';
    }
}

export class TextPartsOptional extends TextPartProgrammable {
    options: Array<TextPartResolvable>;

    constructor(...options: TextPartResolvable[]) {
        super();
        this.options = options;
    };

    resolve(): string {
        let result = '';
        this.options.forEach(option => {
            result += resolveTextPart(option);
        })

        return result;
    }

    resolveGuaranteed(): string {
        const result = this.resolve();

        if (result.trim() == '') return resolveTextPartGuaranteed(oneOf(this.options));
        else return result;
    }
}

export class TextGenerator {
    parts: Array<TextPartResolvable>;

    constructor(...parts: TextPartResolvable[]) {
        this.parts = parts;
    }

    resolve(): string {
        let result = '';
        this.parts.forEach(part => {
            result += resolveTextPartGuaranteed(part);
        });
        return result;
    }
}