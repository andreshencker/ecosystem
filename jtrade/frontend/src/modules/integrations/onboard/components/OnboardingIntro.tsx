import * as React from "react";

type Props = {
    /** Título principal */
    title: string;
    /** Texto descriptivo debajo del título */
    subtitle?: string;
    /** Etiqueta HTML para el título (por defecto h1) */
    tag?: "h1" | "h2" | "h3" | "h4";
    /** Ancho máximo del párrafo */
    maxWidth?: number | string;
};

const OnboardingIntro: React.FC<Props> = ({
                                              title,
                                              subtitle,
                                              tag = "h1",
                                              maxWidth = 560,
                                          }) => {
    const HeadingTag = tag;

    return (
        <div>
            <HeadingTag className="h1">{title}</HeadingTag>

            {subtitle && (
                <p className="lead" style={{maxWidth, marginTop: 12}}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default OnboardingIntro;