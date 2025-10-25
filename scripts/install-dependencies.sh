#!/bin/bash

# Install Python dependencies for vector memory index
# This enables semantic search and prevents context sprawl

set -euo pipefail

echo "🔧 Installing Claude Workflow Engine Dependencies"
echo ""

# Check for Python
PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
else
    echo "❌ Python not found. Please install Python 3.9+ first."
    echo "   Visit: https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_BIN --version 2>&1 | awk '{print $2}')
echo "✓ Found Python: $PYTHON_VERSION"

# Check if pip is available
if ! $PYTHON_BIN -m pip --version >/dev/null 2>&1; then
    echo "❌ pip not found. Please install pip first."
    exit 1
fi

echo "✓ Found pip"
echo ""

# Install vector memory dependencies
echo "📦 Installing vector memory dependencies..."
echo "   This enables semantic search and prevents context sprawl"
echo ""

# Install with version constraints for compatibility
$PYTHON_BIN -m pip install -q --upgrade pip

echo "Installing numpy..."
$PYTHON_BIN -m pip install -q "numpy>=1.24.0,<2.0.0"

echo "Installing sentence-transformers..."
$PYTHON_BIN -m pip install -q "sentence-transformers>=2.2.0,<3.0.0"

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Verify installation
echo "🔍 Verifying installation..."
if $PYTHON_BIN -c "import numpy; import sentence_transformers" 2>/dev/null; then
    NUMPY_VER=$($PYTHON_BIN -c "import numpy; print(numpy.__version__)")
    ST_VER=$($PYTHON_BIN -c "import sentence_transformers; print(sentence_transformers.__version__)")
    echo "   ✓ numpy: $NUMPY_VER"
    echo "   ✓ sentence-transformers: $ST_VER"
    echo ""
    echo "🎉 Vector memory system ready!"
    echo "   Context sprawl prevention: ENABLED"
    echo "   Semantic search: ACTIVE"
else
    echo "   ⚠️  Installation completed but verification failed"
    echo "   You may need to restart your terminal"
fi

echo ""
echo "💡 The workflow engine will now use semantic vector search"
echo "   instead of loading all context, preventing terminal slowdown."
