FROM openjdk:17-slim

# Install build tools and SpotBugs
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    maven \
    gradle \
    && rm -rf /var/lib/apt/lists/*

# Install SpotBugs
ENV SPOTBUGS_VERSION=4.8.3
RUN wget -q https://github.com/spotbugs/spotbugs/releases/download/${SPOTBUGS_VERSION}/spotbugs-${SPOTBUGS_VERSION}.zip \
    && unzip -q spotbugs-${SPOTBUGS_VERSION}.zip -d /opt \
    && rm spotbugs-${SPOTBUGS_VERSION}.zip \
    && ln -s /opt/spotbugs-${SPOTBUGS_VERSION}/bin/spotbugs /usr/local/bin/spotbugs \
    && chmod +x /usr/local/bin/spotbugs

# Install PMD
ENV PMD_VERSION=7.0.0
RUN wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-dist-${PMD_VERSION}-bin.zip \
    && unzip -q pmd-dist-${PMD_VERSION}-bin.zip -d /opt \
    && rm pmd-dist-${PMD_VERSION}-bin.zip \
    && ln -s /opt/pmd-bin-${PMD_VERSION}/bin/pmd /usr/local/bin/pmd \
    && chmod +x /usr/local/bin/pmd

# Install Checkstyle
ENV CHECKSTYLE_VERSION=10.12.5
RUN wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${CHECKSTYLE_VERSION}/checkstyle-${CHECKSTYLE_VERSION}-all.jar \
    -O /opt/checkstyle.jar

# Create wrapper script for Checkstyle
RUN echo '#!/bin/bash\njava -jar /opt/checkstyle.jar "$@"' > /usr/local/bin/checkstyle \
    && chmod +x /usr/local/bin/checkstyle

WORKDIR /workspace

CMD ["/bin/bash"]